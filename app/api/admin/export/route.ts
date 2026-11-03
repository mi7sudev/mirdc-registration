import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminPin(): string {
  return process.env.ADMIN_PIN || process.env.STAFF_PIN || "mirdc2026";
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const pin =
    req.headers.get("x-admin-pin") || req.nextUrl.searchParams.get("pin") || "";
  if (pin !== adminPin())
    return Response.json({ error: "Unauthorized." }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM attendees ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];

  const header = [
    "surname", "first_name", "middle_initial", "extension_name", "agency",
    "position", "email", "contact_number", "attendance", "qr_token",
    "checked_in_at", "email_sent_at", "created_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((h) => csvEscape(r[h])).join(","));
  }
  const csv = lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mirdc-attendees-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
