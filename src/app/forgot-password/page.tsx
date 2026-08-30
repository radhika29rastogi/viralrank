import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { ColorBlock, DisplayHeadline } from "@/components/system";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Reset password</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <AuthForm mode="reset" />
      </ColorBlock>
    </div>
  );
}
