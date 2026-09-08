"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BoldButton } from "@/components/system";
import { PasswordField } from "@/components/auth/PasswordField";
import { mapAuthError } from "@/lib/auth/errors";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPasswordError("");
    setMessage("");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Auth is not configured yet.");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("This reset link is invalid or has expired. Request a new reset email.");
        return;
      }

      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(mapAuthError(err, "Could not update your password."));
        return;
      }
      setMessage("Password updated. Redirecting to sign in…");
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (unknownErr) {
      setError("Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <PasswordField
        id="new-password"
        label="New password"
        value={password}
        onChange={(v) => {
          setPassword(v);
          if (passwordError && v.length >= 8) setPasswordError("");
        }}
        autoComplete="new-password"
        required
        minLength={8}
        hint="Password must be at least 8 characters."
        error={passwordError}
      />
      <PasswordField
        id="confirm-password"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        required
        minLength={8}
      />
      {error ? (
        <p className="text-sm font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm font-bold text-emerald-800">{message}</p> : null}
      <BoldButton type="submit" color="pink" size="lg" disabled={loading}>
        {loading ? "Saving..." : "Save new password"}
      </BoldButton>
    </form>
  );
}
