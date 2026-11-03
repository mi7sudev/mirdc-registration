// Client-safe event model: defaults + types. No server imports here —
/// lib/settings.ts (server) adds DB persistence on top of this.

// ---- System identity (the platform, not the event) ----
export const SYSTEM_SHORT = "MERMS";
export const SYSTEM_NAME =
  "MIRDC Event Registration and Management System";
export const SYSTEM_TAGLINE =
  "An online system that covers all types of MIRDC events, including registration, participant management, attendance monitoring, event scheduling and generation of reports.";

export const FIELD_KEYS = [
  "surname",
  "first_name",
  "middle_initial",
  "extension_name",
  "agency",
  "position",
  "email",
  "contact_number",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldConfig = {
  /** Display label shown on the form. */
  label: string;
  /** Required when the field is enabled. */
  required: boolean;
  /** Hidden from the form when false. */
  enabled: boolean;
};

export type EventSettings = {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  organizer: string;
  privacyNotice: string;
  fields: Record<FieldKey, FieldConfig>;
};

export const DEFAULT_SETTINGS: EventSettings = {
  // TODO: replace with final details per event (or edit in /admin → Event form)
  title: "DOST-MIRDC 3D Construction Printing Launch",
  subtitle: "3D Concrete Printing — Registration with QR Entrance Pass",
  date: "TBA",
  time: "TBA",
  venue: "TBA (MIRDC)",
  organizer: "DOST – Metals Industry Research and Development Center (MIRDC)",
  privacyNotice:
    "In compliance with the Data Privacy Act of 2012 (RA 10173), the DOST-MIRDC collects your name, agency/office, position, email, and contact number solely for event registration, attendance verification, and entrance control for this event. Your data will not be shared with third parties except as required by law. By checking the consent box, you authorize DOST-MIRDC to process your personal data for these purposes.",
  fields: {
    surname: { label: "Surname", required: true, enabled: true },
    first_name: { label: "First Name", required: true, enabled: true },
    middle_initial: { label: "Middle Initial", required: true, enabled: true },
    extension_name: { label: "Extension Name", required: false, enabled: true },
    agency: { label: "Agency / Office", required: true, enabled: true },
    position: { label: "Position / Designation", required: true, enabled: true },
    email: { label: "Email", required: true, enabled: true },
    contact_number: { label: "Contact Number", required: true, enabled: true },
  },
};

export const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  surname: "",
  first_name: "",
  middle_initial: "e.g. A.",
  extension_name: "Jr., Sr., III (optional)",
  agency: "",
  position: "",
  email: "you@agency.gov.ph",
  contact_number: "09XXXXXXXXX",
};

export function displayName(
  r: { first_name?: string | null; surname?: string | null; middle_initial?: string | null },
  fallback = "Attendee"
): string {
  const n = [r.first_name, r.middle_initial, r.surname]
    .filter((v) => v && String(v).trim())
    .join(" ")
    .trim();
  return n || fallback;
}
