# Staywise PMS

Hotel Property Management System built with Next.js 14, Prisma, SQLite, and NextAuth.

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

## Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@staywise.com | admin1234 |
| Front Desk | frontdesk@staywise.com | front1234 |

## Stack

- **Next.js 14** (App Router)
- **Prisma 5** + SQLite (dev)
- **NextAuth v4** (credentials provider)
- **Tailwind CSS v3**
- **TypeScript**
- **lucide-react** (icons)
- **motion** (animations)

## Features

- Dashboard with real-time stats (occupancy, arrivals, departures)
- Reservations list with search and status filters
- Check In / Check Out workflows
- Move Room, Extend Stay, Cancel, No Show
- Charges & Payments (folio management)
- Traces system (inter-department notes)
- Room Grid (color-coded by status)
- Room Timeline (14-day view)
- Guest History
- Night audit countdown
- Full CRUD via REST API

## Security

### Environment Variables
Never commit `.env.local` to git. Generate a strong secret:
```bash
openssl rand -base64 32
```

### Default Credentials
Change these immediately in production:
- `admin@staywise.com` / `admin1234`
- `frontdesk@staywise.com` / `front1234`

### Security Features
- **Rate limiting**: Max 5 login attempts per IP per 15 minutes (in-memory)
- **Brute-force delay**: 1-second delay on failed login to slow enumeration attacks
- **Hotel isolation**: All data queries scoped to the authenticated user's hotel
- **RBAC**: Role-based access — `admin`, `manager`, `front_desk`, `housekeeping`
- **Input validation**: All API inputs validated for type, length, and numeric range
- **Passport masking**: Passport numbers masked in list views; full number in detail view only
- **Generic errors**: Internal resource IDs not leaked in error messages

### PDPA Compliance (Thailand)
Guest passport numbers are masked in list views (`US****456`).
Full passport numbers are only visible in the reservation detail endpoint.

## Project Structure

```
app/
  (auth)/login/      ← Login page
  (dashboard)/       ← Protected dashboard routes
  api/               ← REST API routes
components/          ← UI components
lib/                 ← Prisma, Auth, Utils, Constants
types/               ← TypeScript interfaces
prisma/              ← Schema + Seed data
```
