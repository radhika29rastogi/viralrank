import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Reset password</DisplayHeadline>
      {sp.error === "auth" ? (
        <p className="text-sm font-bold text-rose-700">
          That reset link was invalid or expired. Request a new one below.
        </p>
      ) : null}
      <ColorBlock color="cream" padding="lg">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <AuthForm mode="reset" />
        </Suspense>
      </ColorBlock>
    </div>
  );
}
