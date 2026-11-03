import { NextRequest } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminPin(): string {
  return process.env.ADMIN_PIN || process.env.STAFF_PIN || "mirdc2026";
}

function authorized(req: NextRequest): boolean {
  const pin =
    req.headers.get("x-admin-pin") ||
    req.nextUrl.searchParams.get("pin") ||
    "";
  return pin === adminPin();
}

export async function GET(req: NextRequest) {
  if (!authorized(req))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  return Response.json(getSettings());
}

export async function PUT(req: NextRequest) {
  if (!authorized(req))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const err = saveSettings(body);
  if (err) return Response.json({ error: err }, { status: 400 });
  return Response.json({ ok: true, settings: getSettings() });
}
