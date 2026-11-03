import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminPin(): string {
  return process.env.ADMIN_PIN || process.env.STAFF_PIN || "mirdc2026";
}

function authorized(req: NextRequest): boolean {
  const pin = req.headers.get("x-admin-pin") || "";
  return pin === adminPin();
}

export async function GET(req: NextRequest) {
  if (!authorized(req))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const filter = searchParams.get("filter") || "all"; // all | registered | entered | declined

  const db = getDb();
  let rows = db
    .prepare(`SELECT * FROM attendees ORDER BY created_at DESC LIMIT 5000`)
    .all() as Record<string, string | number | null>[];

  if (filter === "registered")
    rows = rows.filter((r) => r.attendance === "yes" && !r.checked_in_at);
  else if (filter === "entered")
    rows = rows.filter((r) => r.checked_in_at);
  else if (filter === "declined")
    rows = rows.filter((r) => r.attendance === "no");

  if (q) {
    rows = rows.filter((r) =>
      [r.surname, r.first_name, r.agency, r.email, r.qr_token]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }

  const counts = {
    total_yes: (
      db
        .prepare(`SELECT COUNT(*) as c FROM attendees WHERE attendance='yes'`)
        .get() as { c: number }
    ).c,
    entered: (
      db
        .prepare(`SELECT COUNT(*) as c FROM attendees WHERE checked_in_at IS NOT NULL`)
        .get() as { c: number }
    ).c,
    declined: (
      db
        .prepare(`SELECT COUNT(*) as c FROM attendees WHERE attendance='no'`)
        .get() as { c: number }
    ).c,
  };

  return Response.json({ rows, counts });
}
