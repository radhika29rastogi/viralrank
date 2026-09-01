import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export const LISTING_PAYMENT_MIGRATION = "supabase/migrations/0003_listing_payment.sql";

export type ListingPaymentSchemaStatus = {
  ready: boolean;
  table: "creators";
  missingColumns: string[];
  error?: {
    code: string;
    message: string;
    details?: string;
    hint?: string;
  };
};

const LISTING_PAYMENT_COLUMNS = ["listing_payment_status", "published_at"] as const;

function columnFromError(message: string): string[] {
  const columns = new Set<string>();
  const pgrst = message.match(/'([^']+)'\s+column/i);
  if (pgrst?.[1]) columns.add(pgrst[1]);
  const pg = message.match(/column\s+[\w.]+\.(\w+)\s+does not exist/i);
  if (pg?.[1]) columns.add(pg[1]);
  const bare = message.match(/column\s+(\w+)\s+does not exist/i);
  if (bare?.[1]) columns.add(bare[1]);
  for (const col of LISTING_PAYMENT_COLUMNS) {
    if (message.includes(col)) columns.add(col);
  }
  return [...columns];
}

function toErrorFields(error: PostgrestError) {
  return {
    code: error.code,
    message: error.message,
    details: error.details ?? undefined,
    hint: error.hint ?? undefined,
  };
}

/** Verify migration 0003 columns exist before creator listing inserts. */
export async function probeListingPaymentSchema(
  admin: SupabaseClient,
): Promise<ListingPaymentSchemaStatus> {
  const { error } = await admin
    .from("creators")
    .select("listing_payment_status, published_at, status")
    .limit(0);

  if (!error) {
    return { ready: true, table: "creators", missingColumns: [] };
  }

  if (error.code === "PGRST204" || error.message.toLowerCase().includes("does not exist")) {
    const columns = columnFromError(error.message);
    return {
      ready: false,
      table: "creators",
      missingColumns: columns.length ? columns : [...LISTING_PAYMENT_COLUMNS],
      error: toErrorFields(error),
    };
  }

  return {
    ready: false,
    table: "creators",
    missingColumns: [],
    error: toErrorFields(error),
  };
}

export function listingPaymentSchemaErrorMessage(status: ListingPaymentSchemaStatus): string {
  if (status.ready) return "";
  if (status.missingColumns.length) {
    return `Database migration required: run ${LISTING_PAYMENT_MIGRATION} in the Supabase SQL editor (missing column(s): ${status.missingColumns.join(", ")} on public.creators).`;
  }
  return status.error?.message ?? "Creator listing schema is not ready.";
}
