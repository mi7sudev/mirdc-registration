/**
 * Email delivery through the MIRDC mailer middleware
 * (gateway exposing POST /sendMail), not direct SMTP.
 *
 * Env:
 *   MAILER_URL      — full gateway endpoint, e.g. http://10.10.120.43:3232/sendMail
 *   MAILER_API_KEY  — optional; sent as body.api when the gateway enforces it
 *   SMTP_FROM       — sender address
 *   SMTP_FROM_NAME  — system display name used as body.system
 *
 * Gateway contract: { system, to, from, subject, message, text?, api? }
 *   → 200 means accepted.
 *
 * All sends are best-effort: failures return false and must never
 * break registration (the on-screen QR is the real pass).
 * Success page shows mailed status + "Email me my QR" resend box
 * (POST /api/resend-email, requires matching token + email).
 * attendees.email_sent_at tracks last successful QR email; shown in admin
 * ("QR mail" column) and included in CSV export.
 */

const mailerUrl =
  process.env.MAILER_URL || "http://10.10.120.43:3232/sendMail";
const mailerApiKey = process.env.MAILER_API_KEY || "";
const fromEmail = process.env.SMTP_FROM || "fad-agss@mirdc.dost.gov.ph";
const fromName = process.env.SMTP_FROM_NAME || "MERMS";

export type EmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: EmailOptions): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(mailerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: fromName,
        to,
        from: fromEmail,
        subject,
        // Gateway renders `message` as the HTML body.
        message: html || textToHtml(text),
        text,
        ...(mailerApiKey ? { api: mailerApiKey } : {}),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[mail] gateway returned ${res.status} for ${to}`);
      return false;
    }
    console.log(`[mail] sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(
      `[mail] failed to send to ${to}:`,
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export async function sendQrPassEmail(opts: {
  to: string;
  name: string;
  agency: string;
  token: string;
  verifyUrl: string;
  eventTitle: string;
  eventWhen: string;
}): Promise<boolean> {
  // NOTE: no <img> here on purpose — Gmail strips data-URI images and can't
  // fetch LAN-hosted images, so the QR would render as a broken icon.
  // The verify link below opens a page that displays the QR instead.
  const { to, name, agency, token, verifyUrl, eventTitle, eventWhen } = opts;
  const text =
    `Hi ${name} (${agency}),\n\n` +
    `Your registration for "${eventTitle}" (${eventWhen}) is confirmed.\n\n` +
    `YOUR ENTRANCE CODE: ${token}\n\n` +
    `Open this link on your phone to show your QR entrance pass:\n${verifyUrl}\n\n` +
    `Show the QR (or this code) at the entrance. Please keep this email.\n\n— ${fromName}`;
  const html =
    `<p>Hi ${name} (${agency}),</p>` +
    `<p>Your registration for "<b>${eventTitle}</b>" (${eventWhen}) is confirmed.</p>` +
    `<p>Your entrance code:</p>` +
    `<p style="font-size:24px;font-weight:bold;letter-spacing:2px;">${token}</p>` +
    `<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Show my QR entrance pass</a></p>` +
    `<p style="font-size:12px;color:#555;">Or open this link on your phone:<br><a href="${verifyUrl}">${verifyUrl}</a></p>` +
    `<p>Show the QR (or this code) at the entrance. Please keep this email.</p>` +
    `<p>— ${fromName}</p>`;
  return sendEmail({
    to,
    subject: `Your QR Entrance Pass — ${eventTitle}`,
    text,
    html,
  });
}
