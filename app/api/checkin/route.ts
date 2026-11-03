import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One-tap entrance check-in. No PIN: the qr_token itself is the unique,
// unguessable entrance ID, so whoever holds the link/QR is the pass holder.
// Staff/admin screens stay PIN-protected; this endpoint is the pass itself.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const token = String(body.token ?? "").trim().toUpperCase();
  if (!token) return Response.json({ error: "Missing token." }, { status: 400 });

  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM attendees WHERE qr_token = ?`)
    .get(token) as Record<string, string | null> | undefined;

  if (!row)
    return Response.json({ error: "QR token not found." }, { status: 404 });
  if (row.attendance !== "yes")
    return Response.json({ error: "This token is not a valid entry pass." }, { status: 400 });

  if (row.checked_in_at) {
    return Response.json({ attendee: row, already_checked_in: true });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE attendees SET checked_in_at = ? WHERE qr_token = ?`).run(
    now,
    token
  );
  const updated = db
    .prepare(`SELECT * FROM attendees WHERE qr_token = ?`)
    .get(token);
  return Response.json({ attendee: updated, already_checked_in: false });
}
