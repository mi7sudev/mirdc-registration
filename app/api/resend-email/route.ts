import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { sendQrPassEmail } from "@/lib/mailer";
import { displayName } from "@/lib/event";
import { isValidEmail } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  email: string | null;
  first_name: string | null;
  middle_initial: string | null;
  surname: string | null;
  agency: string | null;
  qr_token: string | null;
};

// Backup delivery: (re)send the QR pass to the attendee's own email.
// The email must match the registration — this stops strangers from
// spamming other people's addresses with a known token.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim().toUpperCase();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!token || !email)
    return Response.json(
      { error: "QR token and email are required." },
      { status: 400 }
    );
  if (!isValidEmail(email))
    return Response.json({ error: "Invalid email format." }, { status: 400 });

  const db = getDb();
  const row = db
    .prepare(
      `SELECT email, first_name, middle_initial, surname, agency, qr_token
       FROM attendees WHERE qr_token = ? AND attendance = 'yes'`
    )
    .get(token) as Row | undefined;

  if (!row || (row.email ?? "").toLowerCase() !== email)
    return Response.json(
      { error: "No registration found for that token + email." },
      { status: 404 }
    );

  try {
    const settings = getSettings();
    const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
    const verifyUrl = `${base}/verify/${token}`;
    const ok = await sendQrPassEmail({
      to: email,
      name: displayName(row),
      agency: row.agency || "",
      token,
      verifyUrl,
      eventTitle: settings.title,
      eventWhen: `${settings.date} · ${settings.time} · ${settings.venue}`,
    });
    if (ok) {
      db.prepare(`UPDATE attendees SET email_sent_at = ? WHERE qr_token = ?`).run(
        new Date().toISOString(),
        token
      );
    }
    return Response.json({ ok, email_sent: ok });
  } catch (err) {
    console.error("[mail] resend failed:", err);
    return Response.json({ ok: false, email_sent: false });
  }
}
