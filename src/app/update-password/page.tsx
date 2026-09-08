import type { Metadata } from "next";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export const metadata: Metadata = { title: "Set a new password" };

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <DisplayHeadline size="md">Set a new password</DisplayHeadline>
      <ColorBlock color="cream" padding="lg">
        <UpdatePasswordForm />
      </ColorBlock>
    </div>
  );
}
