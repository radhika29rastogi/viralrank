import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adminCreatorUpdateSchema } from "@/lib/validation/schemas";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;
  return { admin, user };
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const [{ data: creators }, { data: bids }, { data: hypes }] = await Promise.all([
    ctx.admin.from("creators").select("*, categories:category_id(name, slug)").order("created_at", { ascending: false }),
    ctx.admin.from("creator_ranking_bids").select("*").order("created_at", { ascending: false }).limit(50),
    ctx.admin.from("creator_hypes").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  return NextResponse.json({ creators: creators ?? [], bids: bids ?? [], hypes: hypes ?? [] });
}

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = adminCreatorUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (rest.status) patch.status = rest.status;
  if (rest.categoryId) patch.category_id = rest.categoryId;
  if (rest.name) patch.name = rest.name;

  const { error } = await ctx.admin.from("creators").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update creator." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await ctx.admin.from("creators").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete creator." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
