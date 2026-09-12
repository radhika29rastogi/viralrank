import { NextResponse, type NextRequest } from "next/server";

/** No auth gates. Session cookie is a visit hash only, not a login. */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
