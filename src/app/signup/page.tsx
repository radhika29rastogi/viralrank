import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const sp = await searchParams;
  const redirectQuery = sp.redirect ? `?redirect=${encodeURIComponent(sp.redirect)}` : "";

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Sign up</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <AuthForm mode="signup" />
        </Suspense>
      </ColorBlock>
      <p className="text-sm font-bold text-black">
        Already have an account?{" "}
        <Link href={`/login${redirectQuery}`} className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
