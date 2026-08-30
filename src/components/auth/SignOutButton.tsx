"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BoldButton } from "@/components/system";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <BoldButton
      color="yellow"
      onClick={async () => {
        const supabase = createBrowserSupabaseClient();
        await supabase?.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </BoldButton>
  );
}
