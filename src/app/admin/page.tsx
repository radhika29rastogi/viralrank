import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { DisplayHeadline } from "@/components/system";
import { getCategories, getCurrentUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Creator, Hype, RankingBid } from "@/types/database";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const { user, isAdmin } = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/");
  const { items: categories } = await getCategories();
  const admin = createAdminClient();
  let creators: Creator[] = [];
  let bids: RankingBid[] = [];
  let hypes: Hype[] = [];
  if (admin) {
    const [c, b, h] = await Promise.all([
      admin.from("creators").select("*, categories:category_id(name, slug)").order("created_at", { ascending: false }),
      admin.from("creator_ranking_bids").select("*").order("created_at", { ascending: false }).limit(50),
      admin.from("creator_hypes").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    creators = (c.data as Creator[]) ?? [];
    bids = (b.data as RankingBid[]) ?? [];
    hypes = (h.data as Hype[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md">Admin</DisplayHeadline>
      <AdminPanel
        categories={categories}
        initialCreators={creators}
        initialBids={bids}
        initialHypes={hypes}
      />
    </div>
  );
}
