"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BoldButton } from "@/components/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/PasswordField";
import { safeRedirectPath } from "@/lib/security";
import {
  CREATOR_LISTING_PATH,
  destinationForOwnedCreator,
  shouldResolveCreatorHome,
} from "@/lib/auth/post-auth";
import {
  EXISTING_EMAIL_MESSAGE,
  mapAuthError,
  normalizeAuthEmail,
} from "@/lib/auth/errors";

export function AuthForm({ mode }: { mode: "login" | "signup" | "reset" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(
    searchParams.get("redirect"),
    mode === "signup" ? CREATOR_LISTING_PATH : "/dashboard",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPasswordError("");
    setMessage("");

    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) {
      setError("Enter a valid email.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setPasswordError("Password must be at least 8 characters.");
        return;
      }
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Auth is not configured yet. Add Supabase env vars to continue.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (err) {
          setError(mapAuthError(err, "Could not sign in. Check your email and password.", "login"));
          return;
        }
        if (!shouldResolveCreatorHome(redirectTo)) {
          router.push(redirectTo);
          router.refresh();
          return;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: existing } = user
          ? await supabase.from("creators").select("id").eq("user_id", user.id).limit(1).maybeSingle()
          : { data: null };
        router.push(destinationForOwnedCreator(Boolean(existing)));
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const origin = window.location.origin;
        const { data, error: err } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
              shouldResolveCreatorHome(redirectTo) ? CREATOR_LISTING_PATH : redirectTo,
            )}`,
          },
        });
        if (err) {
          setError(mapAuthError(err, "Could not create this account.", "signup"));
          return;
        }
        // Supabase returns a user with empty identities when the email is already registered
        // and email confirmation is enabled (no error is thrown).
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setError(EXISTING_EMAIL_MESSAGE);
          return;
        }
        // Do not keep an unconfirmed session if confirmation is required.
        if (data.session && !data.user?.email_confirmed_at) {
          await supabase.auth.signOut();
        }
        setMessage(
          "Account created! Check your email and click the verification link. You will be signed in and taken to the creator listing form.",
        );
        return;
      }

      const origin = window.location.origin;
      const { error: err } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/update-password")}`,
      });
      if (err) {
        setError(mapAuthError(err, "Could not send a reset email.", "reset"));
        return;
      }
      setMessage("If that email exists, a reset link is on the way. Check your inbox and spam folder.");
    } catch (unknownErr) {
      const fallback =
        mode === "reset"
          ? "Could not send a reset email."
          : mode === "signup"
            ? "Could not create this account."
            : "Could not sign in.";
      setError(fallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {mode === "signup" ? (
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {mode !== "reset" ? (
        <PasswordField
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (passwordError && (mode !== "signup" || v.length >= 8)) setPasswordError("");
          }}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          hint={mode === "signup" ? "Password must be at least 8 characters." : undefined}
          error={passwordError}
        />
      ) : null}
      {error ? (
        <p className="text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm font-bold text-emerald-800">{message}</p> : null}
      <BoldButton type="submit" color="pink" size="lg" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Sign in"
            : mode === "signup"
              ? "Create account"
              : "Send reset link"}
      </BoldButton>
    </form>
  );
}
