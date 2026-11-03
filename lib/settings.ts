import { getDb } from "@/lib/db";
import {
  DEFAULT_SETTINGS,
  FIELD_KEYS,
  type EventSettings,
  type FieldKey,
} from "@/lib/event";

function cloneDefaults(): EventSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as EventSettings;
}

/** Deep-merge stored JSON over defaults so old/missing keys can't break the form. */
function mergeSettings(raw: unknown): EventSettings {
  const base = cloneDefaults();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const k of ["title", "subtitle", "date", "time", "venue", "organizer"] as const) {
    if (typeof r[k] === "string" && (r[k] as string).trim()) base[k] = (r[k] as string).trim();
  }
  if (typeof r.privacyNotice === "string" && r.privacyNotice.trim()) {
    base.privacyNotice = r.privacyNotice.trim();
  }
  if (r.fields && typeof r.fields === "object") {
    const f = r.fields as Record<string, unknown>;
    for (const key of FIELD_KEYS) {
      const c = f[key];
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      if (typeof cc.label === "string" && cc.label.trim()) {
        base.fields[key].label = cc.label.trim().slice(0, 80);
      }
      if (typeof cc.required === "boolean") base.fields[key].required = cc.required;
      if (typeof cc.enabled === "boolean") base.fields[key].enabled = cc.enabled;
    }
  }
  return base;
}

export function getSettings(): EventSettings {
  const db = getDb();
  const row = db
    .prepare(`SELECT value FROM settings WHERE key = 'event'`)
    .get() as { value: string } | undefined;
  if (!row) return cloneDefaults();
  try {
    return mergeSettings(JSON.parse(row.value));
  } catch {
    return cloneDefaults();
  }
}

/** Validate + persist admin-edited settings. Returns error string or null. */
export function saveSettings(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Invalid settings body.";
  const merged = mergeSettings(input);

  // Guardrails: labels usable, at least the form still has a name + contact path
  for (const key of FIELD_KEYS) {
    const c = merged.fields[key as FieldKey];
    if (!c.label) return `Label for "${key}" is required.`;
  }
  if (merged.title.length > 200) return "Title is too long (max 200).";
  if (merged.privacyNotice.length > 5000)
    return "Privacy notice is too long (max 5000).";

  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ('event', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(JSON.stringify(merged));
  return null;
}
