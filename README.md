# MERMS — MIRDC Event Registration and Management System

An online system that covers all types of MIRDC events, including registration, participant management, attendance monitoring, event scheduling and generation of reports.

Runs on your own machine/server. SQLite file DB + Next.js. Phones on the same WiFi/LAN open the form and scan QRs.

Current event: DOST-MIRDC 3D Construction Printing Launch (editable in `/admin` → Event form).

## Quick start

```bash
npm install
cp .env.example .env   # then set STAFF_PIN
npm run build
npm run start -- --port 3000 --hostname 0.0.0.0
```

Find the server's LAN IP (`ipconfig` on Windows), then share:

- Form: `http://<server-ip>:3000/`
- Admin: `http://<server-ip>:3000/admin`
- QR passes point to `http://<server-ip>:3000/verify/<token>` automatically
  (built from `window.location.origin`, so no APP_URL config needed).

Dev mode: `npm run dev`.

## Event day

1. Morning: open `/admin`, Export CSV, print a backup list.
2. Staff: point the phone camera at the guest QR → verify page shows the
   QR + name → tap Mark as Entered (no PIN — the token is the pass).
3. Guest shows QR (screenshot/print) → staff phone camera opens verify URL →
   confirm name → Mark as Entered.
4. Admin table auto-refreshes every 10s. Manual check-in button included.

## Config (.env)

| Var | Default | Use |
|---|---|---|
| `STAFF_PIN` | `mirdc2026` | Unlock `/admin` (verify check-in needs no PIN) |
| `ADMIN_PIN` | = `STAFF_PIN` | Optional separate admin PIN |
| `DB_PATH` | `./data/attendees.db` | SQLite file |
| `PORT` | `3000` | `next start` port |
| `MAILER_URL` | MIRDC gateway | QR email via `POST /sendMail` (best-effort) |
| `MAILER_API_KEY` | _(empty)_ | Only if the gateway enforces it |
| `SMTP_FROM` / `SMTP_FROM_NAME` | MIRDC defaults | Sender shown on QR emails |
| `APP_URL` | request origin | Verify-link base in emails — set to the server LAN IP |

Change `STAFF_PIN` before the event.

## Data & backup

- SQLite file: `data/attendees.db` (auto-created, git-ignored).
- Schema: `sql/schema.sql`.
- Backup anytime: copy `data/attendees.db`, or Export CSV from `/admin`.

## Routes

| Route | What |
|---|---|
| `/` | Attendance Yes/No → attendee form → QR |
| `/success?token=` | QR pass + Download PNG + screenshot reminder |
| `/declined` | Thank-you for "No" answers |
| `/verify/[token]` | Entrance check: shows QR + name/agency/status, one-tap Mark as Entered (no PIN — token is the ID) |
| `/admin` | List, search, filter, manual check-in, CSV export |
| `POST /api/register` | Validate, dedupe by email, create token, best-effort QR email (`email_sent`, stamps `email_sent_at`) |
| `POST /api/resend-email` | `{ token, email }` — re-emails QR if email matches registration (backup for guests who didn't download) |
| `POST /api/checkin` | `{ token }` → set `checked_in_at`, idempotent |
| `GET /api/attendee/[token]` | Public pass lookup |
| `GET /api/settings` | Public event title/fields (drives the form) |
| `GET /api/admin/list` | PIN-header list + counts |
| `GET /api/admin/export` | PIN CSV download |
| `GET/PUT /api/admin/settings` | PIN-protected event editor (title, fields, labels, required, shown) |

## Reusing for the next event

Open `/admin` → **Event form** tab: update title/date/venue/organizer,
rename field labels, toggle required/shown, edit the privacy notice — the
registration form updates immediately. Then clear old attendees (delete rows
in `data/attendees.db`, keeping the `settings` row) and change `STAFF_PIN`.

## Event details

Edit `lib/event.ts` (title/date/time/venue) and `lib/validate.ts` (PH number
rules) as needed.
