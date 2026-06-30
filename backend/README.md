# SoS Backend

REST API + Socket.IO realtime layer for the SoS platform: auth, catalog, booking, dispatch, payments, and admin operations.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed   # creates demo cities, service types, an admin, partners, and customers
npm run dev    # http://localhost:4000, auto-restarts on change
```

Health check: `curl http://localhost:4000/api/health`.

## Demo accounts

With `OTP_DEBUG_MODE=true` (the default), `/api/auth/otp/request` returns the code directly in the response instead of sending an SMS, so you can log in as any of these without a real phone:

| Role | Phone | Notes |
|---|---|---|
| Admin | `+911234500000` | Full access |
| Customer Support | `+911234500001` | Limited-access staff account — see "Roles and the admin console" below |
| RSA agency | `+911234511000` | "QuickFix RSA Agency" |
| Partners | `+911234512001` – `...007` | 5 approved & online near central Delhi, 1 pending KYC review, 1 rejected |
| Customers | `+911234513001`, `...002` | |

Run `npm run seed` again any time to reset to this state (it's idempotent — it skips re-seeding unless you pass `RESEED=true`).

## Roles and the admin console

`ADMIN` and `SUPPORT` are both staff roles that log into the admin dashboard via the same phone+OTP flow as everyone else, but neither can self-register through the public signup endpoint (`POST /auth/otp/verify` with `purpose=SIGNUP` explicitly rejects `role=ADMIN`) — staff accounts only come from an existing Admin creating one via `POST /admin/admins`. `requireRole('ADMIN', 'SUPPORT')` is the default at the top of `admin.routes.js`, with individual routes tightened back down to `requireRole('ADMIN')` wherever the action touches money, KYC decisions, account status, or staffing: pricing/catalog writes, partner approve/reject and profile edits, user status changes, agency writes, broadcast sending, and all of `/admin/admins/*`. Everything else — dashboard analytics, the live map, the request queue and manual assignment, and read access to partners/customers/agencies — is open to Support too, since triage and dispatch are exactly the job.

## Data layer

`prisma/schema.prisma` is the authoritative, documented data model — 18 models covering every entity described in the brief — and `../database/schema.sql` is a hand-written Postgres mirror of the same schema, ready to run as-is.

The backend you're running right now talks to neither of those directly. It uses a small embedded JSON-file store (`src/db/store.js`) behind the exact same repository-function interface a real Prisma client would expose, because this build environment blocks the Prisma engine binary download. Every repository function (`src/repositories/*.js`) is written against that interface, so swapping the implementation — not the call sites — is what moving to production requires:

1. Get `DATABASE_URL` pointed at a real Postgres instance (the connection string format is already in `.env.example`).
2. `npx prisma generate && npx prisma db push` (or `migrate deploy` once you have migrations).
3. Reimplement each repository's exported functions using `@prisma/client` queries instead of the `db.*` JSON-store calls. The function signatures and return shapes are the contract every controller already depends on, so this is a mechanical swap, not a rewrite.

## Integrations

Every third-party integration lives behind a small adapter in `src/integrations/` and automatically falls back to a mock implementation when its API keys are blank in `.env` — this is what makes the whole product runnable with zero external accounts. See the root README's "Going to production" section for what each adapter needs to go live.

## Re-running the test suite

There's an end-to-end smoke test covering the full booking lifecycle (auth, quoting, payment, dispatch, status transitions, chat, OTP completion, rating, cancellation, and the admin override paths) — ask whoever handed you this codebase for `smoke-test.js`, or write your own against the documented endpoints below.

## API surface

All routes are mounted under `/api`. Auth: `POST /auth/otp/request`, `POST /auth/otp/verify` (purpose `SIGNUP` or `LOGIN`, for all four roles except admin self-signup). Catalog: `GET /catalog/services`, `GET /catalog/cities` (public). Public: `GET /public/stats` (unauthenticated, aggregate counts only — backs the public website's live-stats strip, rate-limited to 60 req/min/IP since it's the one route group with no login acting as a natural throttle). Customer booking: `POST /requests/quote`, `POST /requests`, `GET /requests`, `GET /requests/:id`, `GET /requests/:id/partner-location`, `POST /requests/:id/cancel`, `POST /requests/:id/rate`, `GET|POST /requests/:id/chat`. Payments: `POST /payments/:id/confirm`, `POST /payments/:id/simulate-failure`, `POST /payments/webhook`. Partner: `GET /partners/me`, `POST /partners/kyc`, `PATCH /partners/me/availability`, `PATCH /partners/me/location`, `GET|POST|DELETE /partners/me/services[/:id]`, `GET /partners/me/jobs`, `GET /partners/me/earnings`, `GET /partners/me/ratings`, `POST /requests/:id/respond`, `PATCH /requests/:id/status`, `POST /requests/:id/complete`. Admin: `GET /admin/dashboard/summary`, `GET /admin/dashboard/analytics`, `GET /admin/live-map`, `GET /admin/requests`, `POST /admin/requests/:id/assign`, `GET|PATCH /admin/users[/:id]`, `GET /admin/partners`, `PATCH /admin/partners/:id`, `GET /admin/customers`, `POST /admin/partners/:id/approve|reject`, `GET|POST|PATCH /admin/agencies[/:id]`, `GET|POST|PATCH /admin/admins[/:id]` (Admin-only), `POST /admin/notifications/broadcast` (Admin-only; audience `ALL|CUSTOMERS|PARTNERS|USER`, the last requiring a `userId`) and `GET /admin/notifications/broadcasts`, `GET|PATCH /admin/notification-rules[/:id]` (edits are Admin-only; `:id` is a composite key like `ORDER_CONFIRMED:EMAIL`) and `GET /admin/notification-dispatch-log`, `GET /admin/audit-logs` (Admin-only), full catalog/pricing CRUD under `/admin/catalog/*` (writes are Admin-only) including `POST|PATCH /admin/catalog/cities[/:id]` for service-area geofencing and `GET /admin/catalog/place-search` for the city search-as-you-type lookup.
