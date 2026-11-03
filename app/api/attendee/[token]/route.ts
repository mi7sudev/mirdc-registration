import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read of a single pass (name/agency/status only) — no PIN needed to view,
// PIN is required to check in.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/attendee/[token]">
) {
  const { token } = await ctx.params;
  const clean = String(token ?? "").trim().toUpperCase();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT first_name, surname, middle_initial, extension_name, agency, position, qr_token, checked_in_at, created_at
       FROM attendees WHERE qr_token = ?`
    )
    .get(clean) as Record<string, string | null> | undefined;
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ attendee: row });
}
