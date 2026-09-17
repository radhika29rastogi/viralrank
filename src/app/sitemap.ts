import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/format";
import { PUBLIC_CREATOR_STATUS, PUBLIC_LISTING_PAYMENT_STATUS } from "@/lib/creators/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const staticRoutes = [
    "",
    "/rankings",
    "/explore",
    "/submit",
    "/rules",
    "/about",
    "/pricing",
    "/battles",
    "/stats",
    "/contact",
    "/privacy",
    "/terms",
    "/refund",
  ].map((path) => ({
    url: `${origin}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/rankings" ? ("hourly" as const) : ("weekly" as const),
    priority: path === "" ? 1 : 0.7,
  }));

  const admin = createAdminClient();
  if (!admin) return staticRoutes;

  const { data } = await admin
    .from("creators")
    .select("instagram_username, updated_at")
    .eq("status", PUBLIC_CREATOR_STATUS)
    .eq("listing_payment_status", PUBLIC_LISTING_PAYMENT_STATUS);

  const creators = (data ?? []).map((row) => ({
    url: `${origin}/creator/${row.instagram_username}`,
    lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...creators];
}
