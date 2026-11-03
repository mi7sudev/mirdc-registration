import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the registration form + success page need the event title/fields.
export async function GET() {
  return Response.json(getSettings());
}
