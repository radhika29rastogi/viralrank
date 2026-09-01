"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BoldButton } from "@/components/system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function AuthForm({ mode }: { mode: "login" | "signup" | "reset" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Auth is not configured yet. Add Supabase env vars to continue.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError("Could not sign in. Check your email and password.");
        else {
          router.push(redirectTo);
          router.refresh();
        }
      } else if (mode === "signup") {
        const origin = window.location.origin;
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (err) setError("Could not create this account.");
        else setMessage("Check your email to confirm, then sign in.");
      } else {
        const origin = window.location.origin;
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
        });
        if (err) setError("Could not send a reset email.");
        else setMessage("If that email exists, a reset link is on the way.");
      }
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
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      {mode !== "reset" ? (
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      ) : null}
      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm font-bold text-emerald-800">{message}</p> : null}
      <BoldButton type="submit" color="pink" size="lg" disabled={loading}>
        {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
      </BoldButton>
    </form>
  );
}
