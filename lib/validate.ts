import type { EventSettings } from "@/lib/event";
import { FIELD_KEYS } from "@/lib/event";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// PH mobile: allow +639..., 09..., 639... with optional spaces/dashes
export function normalizePHContact(raw: string): string {
  return raw.replace(/[\s-]/g, "").trim();
}

export function isValidPHContact(raw: string): boolean {
  const v = normalizePHContact(raw);
  return /^(\+639\d{9}|09\d{9}|639\d{9})$/.test(v);
}

export type RegisterPayload = {
  attendance: "yes" | "no";
  surname?: string;
  first_name?: string;
  middle_initial?: string;
  extension_name?: string;
  agency?: string;
  position?: string;
  email?: string;
  contact_number?: string;
  privacy_consent?: boolean;
};

/** Required-ness comes from admin settings; disabled fields are ignored. */
export function validateRegister(
  p: RegisterPayload,
  s: EventSettings
): string | null {
  if (p.attendance !== "yes" && p.attendance !== "no")
    return "Please answer the attendance confirmation.";
  if (p.attendance === "no") return null;

  for (const k of FIELD_KEYS) {
    const cfg = s.fields[k];
    if (!cfg.enabled) continue;
    const v = String(p[k] ?? "").trim();
    if (cfg.required && !v) return `Field "${cfg.label}" is required.`;
  }

  const mi = String(p.middle_initial ?? "").trim();
  if (s.fields.middle_initial.enabled && mi && mi.length > 3)
    return "Middle initial must be at most 3 characters.";

  const emailCfg = s.fields.email;
  const email = String(p.email ?? "").trim();
  if (emailCfg.enabled && (emailCfg.required || email) && !isValidEmail(email))
    return "Invalid email format.";

  const contactCfg = s.fields.contact_number;
  const contact = String(p.contact_number ?? "").trim();
  if (
    contactCfg.enabled &&
    (contactCfg.required || contact) &&
    !isValidPHContact(contact)
  )
    return "Invalid PH contact number. Use 09XXXXXXXXX or +639XXXXXXXXX.";

  if (p.privacy_consent !== true) return "Data Privacy consent is required.";
  return null;
}
