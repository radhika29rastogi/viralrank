import { NextResponse } from "next/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import {
  logSupabaseDiagnostics,
  runSupabaseDiagnostics,
  summarizeDiagnosticsFailure,
} from "@/lib/supabase/diagnostics";
import { ensureCategoriesSeeded } from "@/lib/supabase/seed-categories";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Safe probe — never returns keys or secrets. */
export async function GET() {
  const status = getSupabaseConfigStatus();
  const diagnostics = await runSupabaseDiagnostics();
  logSupabaseDiagnostics(diagnostics);

  let categoriesReady = false;
  let categoryCount = 0;
  let categoriesMessage: string | undefined;
  let categoriesErrorCode: string | undefined;

  const canQueryCategories =
    diagnostics.categoriesTable.ok || diagnostics.serviceRoleQuery.ok;

  const admin = createAdminClient();
  if (admin && canQueryCategories) {
    const seed = await ensureCategoriesSeeded(admin);
    if (seed.ok) {
      categoriesReady = seed.total > 0;
      categoryCount = seed.total;
    } else {
      categoriesMessage = seed.message;
      categoriesErrorCode = seed.reason;
    }
  } else if (!diagnostics.urlReachable.ok) {
    categoriesMessage = summarizeDiagnosticsFailure(diagnostics);
  } else if (!canQueryCategories) {
    categoriesMessage = summarizeDiagnosticsFailure(diagnostics);
  }

  const isDev = process.env.NODE_ENV !== "production";

  return NextResponse.json({
    configured: status.configured,
    canSubmitCreators: status.canSubmitCreators,
    categoriesReady,
    categoryCount,
    categoriesMessage,
    categoriesErrorCode,
    hasUrl: status.hasUrl,
    hasAnonKey: status.hasAnonKey,
    hasServiceRoleKey: status.hasServiceRoleKey,
    missing: status.missing,
    urlHost: diagnostics.urlHost,
    anonKeyFormat: diagnostics.anonKeyFormat,
    serviceRoleKeyFormat: diagnostics.serviceRoleKeyFormat,
    urlIncludesRestV1Path: diagnostics.urlIncludesRestV1Path,
    projectPausedOrMissing: diagnostics.projectPausedOrMissing ?? false,
    ...(isDev
      ? {
          diagnostics: {
            urlReachable: diagnostics.urlReachable,
            anonQuery: diagnostics.anonQuery,
            serviceRoleQuery: diagnostics.serviceRoleQuery,
            categoriesTable: diagnostics.categoriesTable,
          },
        }
      : {}),
  });
}
