import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/security";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  let next = safeRedirectPath(searchParams.get("next"), "/dashboard");
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const otpType = rawType && OTP_TYPES.has(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;

  if (otpType === "recovery") {
    next = "/update-password";
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] code exchange failed", error.message);
      const dest = otpType === "recovery" || next === "/update-password" ? "/forgot-password" : "/login";
      return NextResponse.redirect(new URL(`${dest}?error=auth`, request.url));
    }
  } else if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    if (error) {
      console.error("[auth/callback] otp verify failed", error.message);
      const dest = otpType === "recovery" ? "/forgot-password" : "/login";
      return NextResponse.redirect(new URL(`${dest}?error=auth`, request.url));
    }
  } else {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  if (next === "/update-password") {
    return NextResponse.redirect(new URL("/update-password", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
