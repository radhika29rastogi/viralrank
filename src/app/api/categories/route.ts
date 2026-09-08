import { NextResponse } from "next/server";
import { getSubmitCategories } from "@/lib/queries";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "categories-get"), 60);
  if (!limited.ok) {
    return NextResponse.json({ categories: [], error: "Too many requests." }, { status: 429 });
  }

  const { items, error } = await getSubmitCategories();
  if (error) {
    return NextResponse.json({ categories: [], error }, { status: 503 });
  }
  return NextResponse.json({ categories: items });
}
