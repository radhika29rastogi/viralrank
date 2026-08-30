import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Sign up</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <AuthForm mode="signup" />
      </ColorBlock>
      <p className="text-sm font-bold text-black">
        Already have an account? <Link href="/login" className="underline">Sign in</Link>
      </p>
    </div>
  );
}
