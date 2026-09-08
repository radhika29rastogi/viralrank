import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import { safeRedirectPath } from "@/lib/security";

const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/submit", "/admin"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next({ request });
  if (!url || !key) {
    if (AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", safeRedirectPath(pathname));
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(normalizeSupabaseUrl(url), key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", safeRedirectPath(pathname));
    return NextResponse.redirect(login);
  }

  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}
