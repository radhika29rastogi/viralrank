import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const sp = await searchParams;
  const redirectQuery = sp.redirect ? `?redirect=${encodeURIComponent(sp.redirect)}` : "";

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Sign in</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <AuthForm mode="login" />
        </Suspense>
      </ColorBlock>
      <p className="text-sm font-bold text-black">
        <Link href={`/signup${redirectQuery}`} className="underline">
          Create an account
        </Link>
        {" · "}
        <Link href="/forgot-password" className="underline">
          Forgot password
        </Link>
      </p>
    </div>
  );
}
