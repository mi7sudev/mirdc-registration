"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  FIELD_KEYS,
  SYSTEM_SHORT,
  type EventSettings,
  type FieldKey,
} from "@/lib/event";

type Row = {
  id: string;
  attendance: string;
  surname: string | null;
  first_name: string | null;
  middle_initial: string | null;
  agency: string | null;
  position: string | null;
  email: string | null;
  contact_number: string | null;
  qr_token: string | null;
  checked_in_at: string | null;
  email_sent_at: string | null;
  created_at: string;
};

type Filter = "all" | "registered" | "entered" | "declined";
type Tab = "list" | "event";

const META_FIELDS = [
  { k: "title", label: "Event title" },
  { k: "subtitle", label: "Subtitle" },
  { k: "date", label: "Date" },
  { k: "time", label: "Time" },
  { k: "venue", label: "Venue" },
  { k: "organizer", label: "Organizer" },
] as const;

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<Tab>("list");
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ total_yes: 0, entered: 0, declined: 0 });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Event-form editor state
  const [event, setEvent] = useState<EventSettings>(DEFAULT_SETTINGS);
  const [eventLoaded, setEventLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(
    async (p: string, query: string, f: Filter) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/list?q=${encodeURIComponent(query)}&filter=${f}`,
          { headers: { "x-admin-pin": p } }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load.");
          setUnlocked(false);
          return;
        }
        setRows(data.rows);
        setCounts(data.counts);
        setUnlocked(true);
      } catch {
        setError("Cannot reach the server.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchEvent = useCallback(async (p: string) => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { "x-admin-pin": p },
      });
      if (res.ok) return (await res.json()) as EventSettings;
    } catch {
      /* keep defaults */
    }
    return null;
  }, []);

  useEffect(() => {
    if (unlocked) {
      const t = setTimeout(() => load(pin, q, filter), 300);
      return () => clearTimeout(t);
    }
  }, [q, filter, unlocked, pin, load]);

  // Poll every 10s on event day
  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(() => load(pin, q, filter), 10000);
    return () => clearInterval(t);
  }, [unlocked, pin, q, filter, load]);

  useEffect(() => {
    if (!unlocked || eventLoaded) return;
    let cancelled = false;
    fetchEvent(pin).then((s) => {
      if (!cancelled && s) {
        setEvent(s);
        setEventLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [unlocked, eventLoaded, pin, fetchEvent]);

  function unlock(p: string) {
    load(p, "", "all");
    fetchEvent(p).then((s) => {
      if (s) {
        setEvent(s);
        setEventLoaded(true);
      }
    });
  }

  async function saveEvent() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify(event),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error || "Save failed.");
        return;
      }
      setEvent(data.settings);
      setSaveMsg("Saved. The registration form updates immediately.");
    } catch {
      setSaveMsg("Cannot reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function manualCheckin(token: string) {
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Check-in failed");
    else load(pin, q, filter);
  }

  function exportCsv() {
    window.open(`/api/admin/export?pin=${encodeURIComponent(pin)}`, "_blank");
  }

  const setMeta = (k: (typeof META_FIELDS)[number]["k"], v: string) =>
    setEvent((e) => ({ ...e, [k]: v }));
  const setField = (k: FieldKey, patch: Partial<(typeof event.fields)[FieldKey]>) =>
    setEvent((e) => ({ ...e, fields: { ...e.fields, [k]: { ...e.fields[k], ...patch } } }));

  if (!unlocked) {
    return (
      <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
        <main className="mx-auto max-w-sm px-4 py-16">
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h1 className="text-lg font-bold">{SYSTEM_SHORT} — Staff / Admin</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Enter the staff PIN to view the attendee list.
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") unlock(pin);
              }}
              className="mt-4 w-full rounded-lg border border-zinc-300 px-3 py-2"
              placeholder="Staff PIN"
            />
            <button
              onClick={() => unlock(pin)}
              className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              Unlock
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{SYSTEM_SHORT} Admin</h1>
          <div className="ml-2 flex gap-1">
            {(["list", "event"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                  tab === t ? "bg-blue-700 text-white" : "bg-white text-zinc-700 border border-zinc-300"
                }`}
              >
                {t === "list" ? "Attendees" : "Event form"}
              </button>
            ))}
          </div>
          {tab === "list" && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => load(pin, q, filter)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                {loading ? "…" : "Refresh"}
              </button>
              <button
                onClick={exportCsv}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-bold text-white"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>

        {tab === "list" && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900">
                Yes: {counts.total_yes}
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-900">
                Entered: {counts.entered}
              </span>
              <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-bold text-zinc-800">
                Declined: {counts.declined}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name / agency / email / token"
                className="min-w-60 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
              <div className="flex gap-1">
                {(["all", "registered", "entered", "declined"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${
                      filter === f
                        ? "bg-blue-700 text-white"
                        : "bg-white text-zinc-700 border border-zinc-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}

            <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-zinc-900">
              <table className="w-full min-w-3xl text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-zinc-500">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Agency</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Token</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">QR mail</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">
                        {[r.first_name, r.middle_initial, r.surname]
                          .filter(Boolean)
                          .join(" ") || <span className="text-zinc-400">(declined)</span>}
                        <div className="text-xs text-zinc-500">{r.position}</div>
                      </td>
                      <td className="px-3 py-2">{r.agency}</td>
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2">{r.contact_number}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.qr_token}</td>
                      <td className="px-3 py-2">
                        {r.attendance === "no" ? (
                          <span className="text-zinc-500">Declined</span>
                        ) : r.checked_in_at ? (
                          <span className="font-bold text-green-700">Entered</span>
                        ) : (
                          <span className="font-bold text-blue-700">Registered</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.attendance === "no" ? (
                          <span className="text-zinc-400">—</span>
                        ) : r.email_sent_at ? (
                          <span className="font-bold text-green-700" title={r.email_sent_at}>
                            Sent ✓
                          </span>
                        ) : (
                          <span className="font-bold text-amber-700">Not sent</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.attendance === "yes" && !r.checked_in_at && r.qr_token && (
                          <button
                            onClick={() => manualCheckin(r.qr_token!)}
                            className="rounded-lg bg-green-700 px-2 py-1 text-xs font-bold text-white"
                          >
                            Check in
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                        No records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "event" && (
          <div className="mt-4 rounded-xl bg-white p-5 shadow-sm dark:bg-zinc-900">
            <h2 className="font-bold">Event details</h2>
            <p className="text-sm text-zinc-500">
              Changes apply to the registration form immediately. Reuse this site
              for the next event by updating these and resetting the attendee data.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {META_FIELDS.map((f) => (
                <div key={f.k} className={f.k === "title" || f.k === "subtitle" || f.k === "organizer" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                    {f.label}
                  </label>
                  <input
                    value={event[f.k]}
                    onChange={(e) => setMeta(f.k, e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                  Data Privacy notice
                </label>
                <textarea
                  value={event.privacyNotice}
                  onChange={(e) =>
                    setEvent((ev) => ({ ...ev, privacyNotice: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <h2 className="mt-6 font-bold">Form fields</h2>
            <p className="text-sm text-zinc-500">
              Rename labels, toggle required, or hide fields you don&apos;t need.
              Turning off Email also disables email dedupe + QR emails.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-zinc-500">
                    <th className="px-2 py-2">Field</th>
                    <th className="px-2 py-2">Label</th>
                    <th className="px-2 py-2">Required</th>
                    <th className="px-2 py-2">Shown</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_KEYS.map((k) => (
                    <tr key={k} className="border-b last:border-0">
                      <td className="px-2 py-2 font-mono text-xs text-zinc-500">{k}</td>
                      <td className="px-2 py-2">
                        <input
                          value={event.fields[k].label}
                          onChange={(e) => setField(k, { label: e.target.value })}
                          className="w-full rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={event.fields[k].required}
                          onChange={(e) => setField(k, { required: e.target.checked })}
                          className="h-4 w-4 accent-blue-700"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={event.fields[k].enabled}
                          onChange={(e) => setField(k, { enabled: e.target.checked })}
                          className="h-4 w-4 accent-blue-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {saveMsg && (
              <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                {saveMsg}
              </p>
            )}
            <button
              onClick={saveEvent}
              disabled={saving}
              className="mt-4 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save event form"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
