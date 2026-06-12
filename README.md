# Staywise PMS

Hotel Property Management System built with Next.js 14, Prisma, PostgreSQL, and NextAuth.

## Setup

Create `.env` with your database and auth secret:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/staywise"
DIRECT_URL="postgresql://user:pass@host:5432/staywise"   # direct (non-pooled) connection for migrations
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

Then:

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed     # demo data — dates are relative to today, safe to re-run before a demo
npm run dev
```

For production: `npm run build && npm start`.

## Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@staywise.com | admin1234 |
| Front Desk | frontdesk@staywise.com | front1234 |

> Change these immediately in production.

## Stack

- **Next.js 14** (App Router)
- **Prisma 5** + PostgreSQL
- **NextAuth v4** (credentials provider, JWT sessions)
- **Tailwind CSS v3** · **TypeScript** · **lucide-react** (icons) · **motion** (animations)

## Features

### Front Desk
- Dashboard with live stats — occupancy, arrivals, departures, pending traces
- Reservations list with filters; global header search (guest / reservation no. / room)
- Check-in / check-out workflows with verification checklist
- Move room, extend stay, cancel, no-show — all with room-availability conflict checks
- **Double-booking prevention** — overlapping reservations for a room are rejected server-side
- Room Grid (color-coded) and 14-day Room Timeline with drag-and-drop moves
- Guest history with profile preferences and dedup by passport/email/phone

### Billing & Folios
- Multiple folios per reservation; move charges between folios
- Charges, payments, and packages (breakfast, parking, transfers…)
- **Advance deposits** — record a pre-arrival deposit (bank transfer, cash, card…) with a slip reference; it nets out of the folio automatically at check-out
- **Multi-currency** — house exchange-rate table (THB / USD / MMK…) with a cross-rate reference grid in Settings; payments and deposits can be tendered in any configured currency, converted server-side at the house rate with the original amount noted on the charge line
- Settlement by cash (tendered-amount enforced), card, transfer, PromptPay, company credit, or city ledger
- **Check-out is blocked until every folio is settled and every charge is assigned** — enforced by the API, not just the UI
- **City ledger integrity** — posting a folio to a company account is idempotent (re-posting updates the existing receivable instead of duplicating it), and settling requires the posted amount to match the folio balance exactly
- **Early departure** — one-click "shorten stay to today" at check-out so the guest is billed for nights actually stayed
- **Group billing**: link rooms under a master reservation (Linked tab), then "Bill to Master Room" at check-out transfers a linked room's entire balance to the master's folio — the tour leader / company pays once for the whole group
- Company credit accounts with limits, monthly reset, manager override (receivable always recorded), and city ledger AR
- Tax invoices with VAT, printable folios / invoices / company statements
- Printed folio always shows the projected room charge, even before night audit posts the nightly lines

### Operations
- **Night audit** — posts nightly room charges to in-house folios (idempotent per business date); folio balances account for posted nights so the room is never double-counted
- **Shift close / cash drop** — one cash drawer per hotel; open a shift with a float, close with a blind count (expected cash is revealed only after the clerk submits), variance logged with a full breakdown and shift history
- **Housekeeping board** — rooms grouped by status with one-tap "Mark Clean"; housekeeping role can only mark rooms clean, and occupied rooms can't be flipped
- Traces (inter-department notes) with resolution tracking

### Reports & Guest Communication
- **Manager flash report** — printable end-of-day A4: occupancy, room revenue, ADR, RevPAR, collections by payment method, deposits taken, AR outstanding, arrivals/departures and night-audit status
- **Foreign guest registration** — printable immigration report of foreign arrivals per date (full passport numbers, A4 landscape)
- **Booking confirmation** — printable confirmation page with one-tap "Copy for Viber / WhatsApp" plain-text share (includes deposit received / balance due)

### Management
- Analytics — revenue, occupancy, ADR/RevPAR, source & company breakdowns, year comparison
- Accounting — collections by payment method, AR aging, city ledger settlement
- User management with roles; charge-code catalogue

## Security

- **Login rate limiting** — 5 attempts per IP / 15 min, enforced inside the NextAuth `authorize()` flow
- **Enumeration-safe login** — constant-time behaviour for unknown emails (dummy hash compare)
- **JWT sessions capped at 24 h**
- **RBAC** on every mutating/financial endpoint — `admin`, `manager`, `front_desk`, `housekeeping`; financial reports, tax invoices, company management and credit settlement require manager+
- **Hotel isolation** — every query scoped to the authenticated user's hotel
- **Security headers** — `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- **Input validation** on all API inputs (type, length, range)
- **PDPA (Thailand)** — passport numbers masked in list views (`US****456`); full value only in the detail endpoint

## Project Structure

```
app/
  (auth)/login/      ← Animated login page
  (dashboard)/       ← Protected pages (dashboard, reservations, timeline,
                        rooms, housekeeping, guests, companies, shift,
                        reports, analytics, accounting, settings)
  api/               ← REST API routes (auth, reservations, folios, deposits,
                        rooms, companies, credit, shifts, settings,
                        tax-invoices, reports, search…)
  print/             ← Printable folio / confirmation / flash report /
                        foreigner registration / invoice / company statement
components/          ← UI components (views, modals, panels, toaster)
lib/                 ← Prisma, auth, RBAC, rate limit, currency, toast bus, utils
types/               ← TypeScript interfaces
prisma/              ← Schema + today-relative demo seed
scripts/             ← One-off data fixes (city ledger backfill / reconcile)
```
