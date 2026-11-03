import { NextRequest } from "next/server";
import { getDb, generateToken, newId } from "@/lib/db";
import { validateRegister, normalizePHContact } from "@/lib/validate";
import { sendQrPassEmail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { displayName } from "@/lib/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const settings = getSettings();

  const payload = {
    attendance: body.attendance as "yes" | "no",
    surname: String(body.surname ?? "").trim(),
    first_name: String(body.first_name ?? "").trim(),
    middle_initial: String(body.middle_initial ?? "").trim(),
    extension_name: String(body.extension_name ?? "").trim(),
    agency: String(body.agency ?? "").trim(),
    position: String(body.position ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    contact_number: normalizePHContact(String(body.contact_number ?? "")),
    privacy_consent: body.privacy_consent === true,
  };

  const err = validateRegister(payload, settings);
  if (err) return Response.json({ error: err }, { status: 400 });

  const db = getDb();
  const emailEnabled = settings.fields.email.enabled && !!payload.email;
  // Capture now: background email must not depend on the request object.
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");

  // "No" path: record decline, no QR
  if (payload.attendance === "no") {
    const id = newId();
    db.prepare(
      `INSERT INTO attendees (id, attendance, privacy_consent) VALUES (?, 'no', 0)`
    ).run(id);
    return Response.json({ attendance: "no", message: "Thank you." });
  }

  const name = displayName(payload);

  // Dedupe: same email re-registering with "yes" gets the same QR back
  if (emailEnabled) {
    const existing = db
      .prepare(`SELECT * FROM attendees WHERE email = ? AND attendance = 'yes'`)
      .get(payload.email) as Record<string, unknown> | undefined;

    if (existing && typeof existing.qr_token === "string" && existing.qr_token) {
      const token = existing.qr_token as string;
      queuePassEmail(payload.email, { name, agency: payload.agency, token, base });
      return Response.json({
        attendance: "yes",
        token,
        reused: true,
        name,
        email_queued: emailEnabled,
      });
    }
  }

  // Insert with a fresh token, retrying in the (near-impossible) event of a
  // concurrent token collision instead of failing the registration.
  let token = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = generateToken();
    const clash = db
      .prepare(`SELECT 1 FROM attendees WHERE qr_token = ?`)
      .get(candidate);
    if (clash) continue;
    try {
      db.prepare(
        `INSERT INTO attendees
          (id, attendance, surname, first_name, middle_initial, extension_name, agency, position, email, contact_number, privacy_consent, qr_token)
         VALUES (?, 'yes', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).run(
        newId(),
        payload.surname || null,
        payload.first_name || null,
        payload.middle_initial || null,
        payload.extension_name || null,
        payload.agency || null,
        payload.position || null,
        payload.email || null,
        payload.contact_number || null,
        candidate
      );
      token = candidate;
      break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/unique/i.test(msg) || attempt === 2) {
        return Response.json({ error: `Database error: ${msg}` }, { status: 500 });
      }
      // Token taken by a concurrent request — retry with a new one.
    }
  }
  if (!token)
    return Response.json(
      { error: "Could not generate QR token, please retry." },
      { status: 500 }
    );

  if (emailEnabled) {
    queuePassEmail(payload.email, { name, agency: payload.agency, token, base });
  }

  return Response.json({
    attendance: "yes",
    token,
    reused: false,
    name,
    email_queued: emailEnabled,
  });
}

function stampEmailSent(token: string) {
  try {
    getDb()
      .prepare(`UPDATE attendees SET email_sent_at = ? WHERE qr_token = ?`)
      .run(new Date().toISOString(), token);
  } catch (err) {
    console.error("[mail] could not stamp email_sent_at:", err);
  }
}

// Best-effort QR email via the MIRDC mailer gateway.
// Fire-and-forget: bursts of registrations never wait on the mail gateway.
// The response goes out first; delivery stamps email_sent_at when done.
function queuePassEmail(
  to: string,
  attendee: { name: string; agency: string; token: string; base: string }
): void {
  sendPassEmail(to, attendee)
    .then((ok) => {
      if (ok) stampEmailSent(attendee.token);
    })
    .catch((err) => console.error("[mail] background send failed:", err));
}

// Never throws — registration succeeds even if email fails.
async function sendPassEmail(
  to: string,
  attendee: { name: string; agency: string; token: string; base: string }
): Promise<boolean> {
  try {
    const settings = getSettings();
    const verifyUrl = `${attendee.base}/verify/${attendee.token}`;
    return await sendQrPassEmail({
      to,
      name: attendee.name,
      agency: attendee.agency,
      token: attendee.token,
      verifyUrl,
      eventTitle: settings.title,
      eventWhen: `${settings.date} · ${settings.time} · ${settings.venue}`,
    });
  } catch (err) {
    console.error("[mail] pass email skipped:", err);
    return false;
  }
}
