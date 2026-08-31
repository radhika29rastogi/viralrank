import { NextResponse } from "next/server";
import { getSubmitCategories } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const { items, error } = await getSubmitCategories();
  if (error) {
    return NextResponse.json({ categories: [], error }, { status: 503 });
  }
  return NextResponse.json({ categories: items });
}
