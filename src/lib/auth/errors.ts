/** Map Supabase Auth errors to safe user-facing copy. Never include passwords. */

const EXISTING_EMAIL =
  "An account with this email already exists. Please sign in.";

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function mapAuthError(
  error: { message?: string; code?: string; status?: number } | null | undefined,
  fallback: string,
  context?: "login" | "signup" | "reset",
): string {
  if (!error) return fallback;
  const message = (error.message ?? "").trim();
  const code = (error.code ?? "").toLowerCase();
  const lower = message.toLowerCase();

  if (
    code === "user_already_exists" ||
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already exists")
  ) {
    return EXISTING_EMAIL;
  }

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }

  if (lower.includes("redirect") || lower.includes("redirect_to") || code === "validation_failed") {
    return "This site is not allowlisted for auth emails. Add the /auth/callback URL in Supabase → Authentication → URL Configuration → Redirect URLs.";
  }

  if (code === "over_email_send_rate_limit" || lower.includes("rate limit")) {
    if (context === "signup") {
      return "Too many emails were sent. If you already have an account, sign in or check your inbox.";
    }
    return "Too many emails were sent. Wait a minute and try again.";
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return "Enter a valid email address.";
  }

  if (code === "weak_password" || (lower.includes("password") && (lower.includes("8") || lower.includes("least") || lower.includes("weak")))) {
    return "Password must be at least 8 characters.";
  }

  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Could not sign in. Check your email and password.";
  }

  return fallback;
}

export const EXISTING_EMAIL_MESSAGE = EXISTING_EMAIL;
