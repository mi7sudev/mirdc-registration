"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { DEFAULT_SETTINGS, type EventSettings } from "@/lib/event";

function SuccessInner() {
  const params = useSearchParams();
  const token = (params.get("token") || "").toUpperCase();
  const [qr, setQr] = useState<string | null>(null);
  const [settings, setSettings] = useState<EventSettings>(DEFAULT_SETTINGS);
  const verifyUrl =
    typeof window !== "undefined" && token
      ? `${window.location.origin}/verify/${token}`
      : "";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (r) => {
        if (!cancelled && r.ok) setSettings(await r.json());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!verifyUrl) return;
    let cancelled = false;
    QRCode.toDataURL(verifyUrl, { width: 512, margin: 2 })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-red-700">Missing QR token. Please register again.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-blue-700 underline">
          Back to registration
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 text-center">
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <p className="text-xs font-bold uppercase tracking-widest text-green-700">
          Registration successful
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Your QR Entrance Pass
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{settings.title}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {settings.date} · {settings.venue}
        </p>

        <div className="mx-auto mt-5 w-fit rounded-xl border border-zinc-200 bg-white p-4">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={`QR pass ${token}`} width={240} height={240} />
          ) : (
            <div className="flex h-60 w-60 items-center justify-center text-sm text-zinc-500">
              Generating QR…
            </div>
          )}
        </div>
        <p className="mt-3 font-mono text-lg font-bold tracking-widest text-zinc-900 dark:text-zinc-50">
          {token}
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Screenshot this page — show it at the entrance.
        </p>

        <div className="mt-4 flex gap-2">
          {qr && (
            <a
              href={qr}
              download={`MIRDC-QR-${token}.png`}
              className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              Download QR
            </a>
          )}
          <Link
            href="/"
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            Done
          </Link>
        </div>
        {verifyUrl && (
          <p className="mt-3 break-all text-xs text-zinc-500">{verifyUrl}</p>
        )}
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-full bg-zinc-100 dark:bg-zinc-950">
      <Suspense fallback={<main className="p-16 text-center">Loading…</main>}>
        <SuccessInner />
      </Suspense>
    </div>
  );
}
