import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Sign in</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <AuthForm mode="login" />
      </ColorBlock>
      <p className="text-sm font-bold text-black">
        <Link href="/signup" className="underline">Create an account</Link>
        {" · "}
        <Link href="/forgot-password" className="underline">Forgot password</Link>
      </p>
    </div>
  );
}
