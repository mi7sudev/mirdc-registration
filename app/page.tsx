"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SETTINGS,
  FIELD_KEYS,
  FIELD_PLACEHOLDERS,
  SYSTEM_SHORT,
  SYSTEM_TAGLINE,
  type EventSettings,
  type FieldKey,
} from "@/lib/event";

type Attendance = "yes" | "no" | null;

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300";

function emptyForm(): Record<FieldKey, string> {
  return {
    surname: "",
    first_name: "",
    middle_initial: "",
    extension_name: "",
    agency: "",
    position: "",
    email: "",
    contact_number: "",
  };
}

function inputType(k: FieldKey): string {
  if (k === "email") return "email";
  if (k === "contact_number") return "tel";
  return "text";
}

export default function Home() {
  const router = useRouter();
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_SETTINGS);
  const [step, setStep] = useState<1 | 2>(1);
  const [attendance, setAttendance] = useState<Attendance>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<FieldKey, string>>(emptyForm);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (r) => {
        if (!cancelled && r.ok) setSettings(await r.json());
      })
      .catch(() => {
        /* offline-safe: keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFields = FIELD_KEYS.filter((k) => settings.fields[k].enabled);
  const fullWidth = (k: FieldKey) => k === "agency" || k === "position";

  async function handleAttendanceNext() {
    setError(null);
    if (!attendance) {
      setError("Please select Yes or No.");
      return;
    }
    if (attendance === "no") {
      setSubmitting(true);
      try {
        await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attendance: "no" }),
        });
      } catch {
        /* offline-safe: still thank them */
      } finally {
        setSubmitting(false);
      }
      router.push("/declined");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance: "yes",
          ...form,
          privacy_consent: consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      router.push(`/success?token=${encodeURIComponent(data.token)}`);
    } catch {
      setError("Cannot reach the local server. Check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-[10px] font-black text-white">
            {SYSTEM_SHORT}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
              {settings.organizer}
            </p>
            <h1 className="text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50">
              {settings.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Step {step} of 2 — {step === 1 ? "Attendance confirmation" : "Attendee details"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {settings.subtitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Date: {settings.date} · Time: {settings.time} · Venue: {settings.venue}
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Each attendee registers individually. Your QR entrance pass appears
            after submitting.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="mt-5 space-y-3">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Will you attend?
              </p>
              {(
                [
                  { v: "yes", t: "Yes, I will attend." },
                  { v: "no", t: "No, I can neither attend nor send a representative." },
                ] as const
              ).map((o) => (
                <label
                  key={o.v}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    attendance === o.v
                      ? "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                      : "border-zinc-300 text-zinc-800 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="attendance"
                    checked={attendance === o.v}
                    onChange={() => setAttendance(o.v)}
                    className="h-4 w-4 accent-blue-700"
                  />
                  {o.t}
                </label>
              ))}
              <button
                onClick={handleAttendanceNext}
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Continue"}
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleFields.map((k) => {
                const cfg = settings.fields[k];
                return (
                  <div key={k} className={fullWidth(k) ? "sm:col-span-2" : ""}>
                    <label className={labelCls}>
                      {cfg.label} {cfg.required ? "*" : "(optional)"}
                    </label>
                    <input
                      className={inputCls}
                      type={inputType(k)}
                      value={form[k]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [k]: e.target.value }))
                      }
                      required={cfg.required}
                      maxLength={k === "middle_initial" ? 3 : undefined}
                      placeholder={FIELD_PLACEHOLDERS[k]}
                    />
                  </div>
                );
              })}

              <div className="rounded-xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 sm:col-span-2">
                <p className="font-bold">Data Privacy Act of 2012 Notice</p>
                <p className="mt-1">{settings.privacyNotice}</p>
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-700"
                    required
                  />
                  I agree to the collection and processing of my data for this event. *
                </label>
              </div>

              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit & Get QR Pass"}
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-zinc-500">
          {SYSTEM_SHORT} — Hosted on the event local server. No internet account needed.
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-400">{SYSTEM_TAGLINE}</p>
      </main>
    </div>
  );
}
