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
- Settlement by cash (tendered-amount enforced), card, transfer, PromptPay, company credit, or city ledger
- **Check-out is blocked until every folio is settled and every charge is assigned** — enforced by the API, not just the UI
- **Group billing**: link rooms under a master reservation (Linked tab), then "Bill to Master Room" at check-out transfers a linked room's entire balance to the master's folio — the tour leader / company pays once for the whole group
- Company credit accounts with limits, monthly reset, manager override (receivable always recorded), and city ledger AR
- Tax invoices with VAT, printable folios / invoices / company statements

### Operations
- **Night audit** — posts nightly room charges to in-house folios (idempotent per business date); folio balances account for posted nights so the room is never double-counted
- **Housekeeping board** — rooms grouped by status with one-tap "Mark Clean"; housekeeping role can only mark rooms clean, and occupied rooms can't be flipped
- Traces (inter-department notes) with resolution tracking

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
                        rooms, housekeeping, guests, companies, analytics,
                        accounting, settings)
  api/               ← REST API routes (auth, reservations, folios, rooms,
                        companies, credit, tax-invoices, reports, search…)
  print/             ← Printable folio / invoice / company statement
components/          ← UI components (views, modals, panels, toaster)
lib/                 ← Prisma, auth, RBAC, rate limit, toast bus, utils
types/               ← TypeScript interfaces
prisma/              ← Schema + today-relative demo seed
```
