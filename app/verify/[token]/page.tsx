"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";

type Attendee = {
  first_name: string | null;
  surname: string | null;
  middle_initial: string | null;
  extension_name: string | null;
  agency: string | null;
  position: string | null;
  qr_token: string | null;
  checked_in_at: string | null;
  created_at: string | null;
};

function fullName(a: Attendee): string {
  return [a.first_name, a.middle_initial, a.surname, a.extension_name]
    .filter(Boolean)
    .join(" ");
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const clean = String(token ?? "").toUpperCase();
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pageUrl =
    typeof window !== "undefined" && clean
      ? `${window.location.origin}/verify/${clean}`
      : "";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attendee/${encodeURIComponent(clean)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) setNotFound(true);
        else {
          const d = await r.json();
          setAttendee(d.attendee);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clean]);

  useEffect(() => {
    if (!pageUrl) return;
    let cancelled = false;
    QRCode.toDataURL(pageUrl, { width: 512, margin: 2 })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pageUrl]);

  async function checkIn() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Check-in failed.");
        return;
      }
      setAttendee(data.attendee);
      setMsg(
        data.already_checked_in
          ? `Already entered at ${data.attendee.checked_in_at}.`
          : "Marked as Entered. Welcome!"
      );
    } catch {
      setMsg("Cannot reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Entrance verification
          </p>
          <p className="font-mono text-lg font-bold tracking-widest">{clean}</p>

          {!loaded && <p className="mt-4 text-sm">Loading…</p>}
          {notFound && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
              QR token not found. Check the code and retry.
            </div>
          )}
          {attendee && (
            <div className="mt-4">
              <div className="mx-auto w-fit rounded-xl border border-zinc-200 bg-white p-4">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt={`QR pass ${clean}`} width={220} height={220} />
                ) : (
                  <div className="flex h-55 w-55 items-center justify-center text-sm text-zinc-500">
                    Generating QR…
                  </div>
                )}
              </div>
              <h1 className="mt-3 text-xl font-bold">{fullName(attendee)}</h1>
              <p className="text-sm text-zinc-600">{attendee.agency}</p>
              <p className="text-sm text-zinc-600">{attendee.position}</p>
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-sm font-bold ${
                  attendee.checked_in_at
                    ? "bg-green-100 text-green-900"
                    : "bg-blue-50 text-blue-900"
                }`}
              >
                {attendee.checked_in_at
                  ? `Already Entered — ${attendee.checked_in_at}`
                  : "Registered — not yet entered"}
              </div>

              {msg && (
                <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800">
                  {msg}
                </p>
              )}
              <button
                onClick={checkIn}
                disabled={busy}
                className="mt-4 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {busy ? "Checking in…" : "Mark as Entered"}
              </button>
              {qr && (
                <a
                  href={qr}
                  download={`MERMS-QR-${clean}.png`}
                  className="mt-2 block rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Download QR
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
