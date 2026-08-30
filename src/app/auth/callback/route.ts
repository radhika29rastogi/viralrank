import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
