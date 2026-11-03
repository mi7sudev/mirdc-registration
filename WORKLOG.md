# WORKLOG — MERMS (MIRDC Event Registration and Management System)

Handoff log so any AI picking this up knows exactly where things stand.
Last updated: 2026-11-03.

## Identity

- **System:** MIRDC Event Registration and Management System (**MERMS**) —
  covers all MIRDC event types: registration, participant management,
  attendance monitoring, event scheduling, report generation.
  (Scheduling/reports beyond registration + CSV are future scope.)
- **Current event (do NOT rename):** DOST-MIRDC 3D Construction Printing Launch.
  Event details are admin-editable settings; the system name is code-level.

## What this is

Reusable event registration site: guest form → QR entrance pass → staff
check-in → admin list/CSV. Built for DOST-MIRDC's 3D Concrete Printing launch,
designed to be reused for future events by editing the event in `/admin`.

Location: `C:\Users\jtvillegas\Desktop\registration form\mirdc-registration`
(`registration form` folder also holds the original spec `.txt` + `.md`.)

## Stack decisions (locked in with the user)

- **Local server, NOT cloud.** User said: deploy on their own local server.
  No Supabase, no Vercel, no Resend. Spec `.md` was rewritten to match.
- **Next.js 16.4.4 App Router + TypeScript + Tailwind v4** (fresh
  `create-next-app`, `cacheComponents: false` — this is a fully dynamic LAN app).
- **SQLite via `better-sqlite3`**, file `data/attendees.db` (auto-created,
  git-ignored). Schema in `sql/schema.sql`. `DB_PATH` env can override.
- **No attendee accounts. One staff PIN** (`STAFF_PIN`, default `mirdc2026`;
  `ADMIN_PIN` optionally separate) protects **`/admin` only**. `/verify`
  check-in is PIN-free by user decision — the `qr_token` is the unique,
  unguessable entrance ID.
- **QR = plain URL** `http://<server-ip>:3000/verify/<token>`, built in the
  browser from `window.location.origin` — always correct on LAN, no config.
  Token format `MIRDC-` + 8 unambiguous chars.
- **Email via MIRDC mailer middleware** (`POST /sendMail` gateway contract
  `{ system, to, from, subject, message, text, api? }`), benchmarked off the
  user's CRO-system snippet (pattern only — nothing pasted). Sender
  `fad-agss@mirdc.dost.gov.ph` goes to **guests' own inboxes** (any domain).
  Best-effort + fire-and-forget: register responds immediately with
  `email_queued`, delivery stamps `email_sent_at` when done, failures never
  break registration. Email has NO embedded QR image (Gmail strips data-URIs)
  — big entrance code + "Show my QR entrance pass" button linking to
  `/verify`, which renders the QR. `APP_URL` must be the server LAN IP.
  Defaults: `MAILER_URL=http://10.10.120.43:3232/sendMail`.
- **Next 16 breaking-change notes** (per repo `AGENTS.md`, docs were read):
  `params` is a `Promise` (await or `use()`), `runtime`/`dynamic` segment
  config incompatible with `cacheComponents` (we disabled it instead),
  `LayoutProps<"/">` + `RouteContext<'/...'>` typing, lint rule
  `react-hooks/set-state-in-effect` (use async `.then` + cancelled flag).

## File map

- `app/page.tsx` — 2-step form, renders fields from `GET /api/settings`
- `app/success/page.tsx` — QR pass + Download PNG (QR via `qrcode` client-side)
- `app/declined/page.tsx` — thank-you for "No"
- `app/verify/[token]/page.tsx` — entrance check: renders QR + name/agency,
  one-tap Mark as Entered (NO pin)
- `app/admin/page.tsx` — tabs: Attendees (search/filter/poll-10s/manual check-in/CSV, incl. "QR mail" Sent/Not-sent column) + Event form (meta + field labels/required/shown + privacy notice)
- `app/api/register/route.ts` — validate (settings-driven), dedupe by email, collision-retrying token insert, background QR email (`email_queued`)
- `app/api/checkin/route.ts` — `{ token }`, idempotent (`already_checked_in`)
- `app/api/attendee/[token]/route.ts` — public pass lookup
- `app/api/settings/route.ts` — public event settings
- `app/api/admin/list|export|settings/route.ts` — PIN-protected admin APIs
- `lib/db.ts` (SQLite + token gen), `lib/event.ts` (client-safe defaults/types),
  `lib/settings.ts` (server get/save + merge), `lib/validate.ts`
  (settings-driven validation), `lib/mailer.ts` (gateway client + QR template),
  `app/api/resend-email/route.ts` (token+email-matched QR re-send)
- `.env` exists locally (copy of `.env.example`); never commit real PINs.
- `README.md` — run guide. Spec `.md` lives one folder up.

## Capacity & burst test — read before event day / handoff

**Q: can 100 users register at the same time? A: yes, proven.**

- 2026-11-03 burst test: `node scripts/load-test.mjs http://<server>:<port> 100`
  (script lives in `scripts/`, N defaults to 100) → **100/100 success,
  100 unique tokens, 542ms wall, p50 353ms, p95 495ms**, against a
  `next start` production build. Re-run anytime; it uses `loadtest*@mirdc.local`
  addresses — delete those rows afterwards.
- Why it holds up: SQLite/WAL serializes the tiny writes (sub-ms each);
  registration never waits on email (fire-and-forget, stamps `email_sent_at`
  on completion); token insert retries on concurrent collision.
- **External bottleneck is the mailer gateway, NOT this app.** Same day, right
  after the burst, `10.10.120.43:3232/sendMail` began returning **HTTP 500 even
  for a minimal direct probe** (it returned 200 earlier that day) — i.e. the
  small gateway box likely can't take 100-at-once, or its SMTP backend is down.
  Next dev / event-day operator must confirm gateway capacity with its admin.
- Safety nets already in the app for exactly this: on-screen QR is the real
  pass (registration always succeeds); admin "QR mail" column shows Sent ✓ /
  Not sent per row (also in CSV); `POST /api/resend-email` re-sends any pass
  when given matching token + email.
- **Do not restart the server within seconds of a registration burst** —
  background emails die with the process. Missed ones show as "Not sent" and
  can be re-sent per guest.
- Scale ceiling, honestly: one Node process + one SQLite file is right for
  hundreds of concurrent LAN users. Multi-machine replicas would need a
  networked DB — out of scope unless an event outgrows a single server.

## Verified (against `next start` production builds)

- register → pass lookup → check-in → double-scan `already_checked_in`
- wrong PIN 403, bad email/contact 400, dedupe returns same token (`reused`)
- admin counts, CSV export content, `/` + `/verify` render
- gateway reachable from dev machine → `email_sent: true` live
- settings PUT → public form reflects change; required-toggle enforced
  server-side (agency optional → empty agency accepted)
- resend-email: matching token+email → sent + stamped; mismatch → 404
- 2026-11-03: real gmail registration found with `email_sent_at = null`
  (its server predated the mailer build) — QR emailed via resend endpoint,
  row stamped, data kept
- Email v2: dropped `<img data-URI>` (Gmail strips it → broken icon) —
  email now shows big entrance code + "Show my QR entrance pass" button;
  `/verify/[token]` renders the QR itself. `APP_URL` set to server LAN IP
  (was `localhost` when registering from the server).
- `/verify` check-in is PIN-free (token is the unique ID); PIN stays on `/admin`.
- Burst-ready register: email sends fire-and-forget (response never waits on
  the gateway; stamps `email_sent_at` when done, returns `email_queued`),
  insert retries on concurrent token collision.
- Burst test 2026-11-03: `node scripts/load-test.mjs` 100 concurrent
  registrations → 100/100 success, 100 unique tokens, 542ms wall (p95 495ms).
- Gateway incident same day: after the burst, `10.10.120.43:3232/sendMail`
  returns HTTP 500 even for a minimal direct probe (was 200 earlier) —
  gateway-side, not this app. Burst traffic may overwhelm that small gateway;
  its admin should confirm capacity. Safety nets in place: on-screen QR is
  the real pass, `email_queued` + admin "QR mail" column + resend endpoint.
- Caveat: background emails die with a server restart — don't restart within
  seconds of a registration burst; any missed mail shows as "Not sent" and
  can be re-sent per guest.
- `npm run lint` + `npm run build` clean
- Test rows/settings always cleaned after tests (attendees count back to
  real rows only, settings row deleted → defaults)

## How to run / test

```bash
npm run build
npm run start -- --port 3000 --hostname 0.0.0.0   # LAN: http://<server-ip>:3000/
# admin: /admin + STAFF_PIN  # verify: /verify/<token>
```

## TODO / pending with user

- [ ] Final event title/date/time/venue — currently placeholders (edit in
  `/admin` → Event form, or `lib/event.ts` defaults)
- [ ] Change `STAFF_PIN` in `.env` before the event
- [ ] Test on venue LAN: phone scan → check-in → admin updates
- [ ] Morning-of: Export CSV + print backup list
- [ ] Mailer gateway health: it returned HTTP 500 after a 100-at-once burst
  (see "Capacity & burst test" above) — confirm with its admin before event
  day. If it stays down, email silently skips and the on-screen QR is the pass;
  catch up via the admin "QR mail" column + resend endpoint.
- [ ] Optional: reset attendee data between events (delete `data/attendees.db`
  rows or the file; settings survive in the same DB — delete only `attendees`
  rows to keep event config)
- [ ] Security note: user's pasted snippet contained a live `CSM_API_KEY` —
  not used here, but it should be rotated if shared. Never commit `.env`.
