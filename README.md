# SoS — Services On Site

An on-demand roadside assistance platform: a customer app for booking help, a partner app for service providers, an admin dispatch console, and the backend that ties them together in real time.

## What's in this repository

```
sos-app/
  backend/              Node.js + Express + Socket.IO REST API
  website/               React + Vite public marketing site (sos.ind.in)
  admin-dashboard/       React + Vite web app for operations staff (the "portal")
  mobile-customer-app/   Expo (React Native) app for riders
  mobile-partner-app/    Expo (React Native) app for service partners
  database/schema.sql    Hand-written Postgres DDL mirroring the Prisma schema
```

Each app has its own README with setup commands; this document covers how the pieces fit together and what to do before any of this touches real users or real money.

## Architecture at a glance

Four roles share one backend: customers book and pay, partners fulfill jobs, an optional RSA agency owns a pool of partners, and admins run the dispatch console. Everything authenticates with phone-number OTP and a JWT, and every party that needs to see something happen live — a partner's location, a request changing status, a chat message — gets it over the same Socket.IO connection rather than polling, with REST as the fallback for anything that isn't time-sensitive.

Booking is prepaid by design: creating a request also creates a payment order, and partner dispatch only begins once that payment is confirmed (`POST /payments/:id/confirm`). Dispatch itself is a sequential nearest-partner offer queue — rank eligible online/available/KYC-approved partners by straight-line distance, offer to the nearest one with a 45-second response window, fall through to the next on reject or timeout, and mark the request `NO_PARTNER_FOUND` if the queue empties out so an admin can step in with a manual assignment. The request lifecycle itself is a strict state machine (`REQUESTED → ASSIGNED → EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED`, with `CANCELLED` and `NO_PARTNER_FOUND` as side exits) enforced server-side, and completion requires the partner to enter an OTP the customer reads aloud — the same trick ride-hailing apps use to prove the right two people actually met.

The service catalog and city-level pricing rules are admin-editable data, not code — adding a new service type or expanding into a second city is a dashboard action, not a deploy.

## The admin console

Beyond live dispatch, the dashboard covers the full back-office surface: a Users page for editing any account's name/email/status, a Partners page with KYC approval plus a profile editor (vehicle, city, fleet assignment, with the assigned fleet visible directly in the directory table) and suspend/reactivate, a Fleets page for onboarding agencies and seeing their roster of partners, a Cities page for adding service areas with a search-as-you-type place lookup and a circular geofence (center + radius) previewed live on a map, a Pricing page where city/surge rules can be edited or disabled after creation (not just created once and left alone), a Notifications page for broadcasts to everyone, a segment, or one specific person (with a name/phone search picker), an Audit Log page listing every sensitive action with who did it and when, and a 14-day requests/revenue trend chart alongside the live summary on Overview. The Live Map renders a distinct rounded-line icon per service type on every request marker, color-coded by status (blue/orange/purple/teal/amber/green/red across the seven lifecycle stages), with filter chips for both service and status — this status palette is dashboard-only, distinct from the mobile apps' brand-constrained 3-tier system, since an internal ops tool benefits from a richer color vocabulary than a consumer-facing brand identity should carry.

The city search box uses Photon (komoot's free, key-less OSM geocoder) rather than Nominatim's raw `/search` endpoint — Nominatim's usage policy explicitly forbids building autocomplete on top of it, while Photon is built for exactly that. If the public Photon instance is ever unreachable, the search box degrades to a clear inline message and the admin can still fill in name/coordinates/radius by hand; nothing about city creation hard-depends on that third party being up.

**Known limitation:** a city's geofence (center point + radius) is currently configuration-only. Partner matching in `dispatch.service.js` still ranks candidates by straight-line distance from the *customer's* pickup point (within `DEFAULT_SEARCH_RADIUS_KM`, default 8km) and doesn't check whether that point falls inside any city's defined service area, or restrict matching to partners registered in the same city. Wiring the geofence into actual dispatch/availability logic — e.g. rejecting requests outside every active city's radius, or only offering a job to partners whose city matches — is real follow-up work, not yet done.

A `SUPPORT` role sits alongside `ADMIN` for staff who need day-to-day access — triage, dispatch, live map, analytics, read access to partners/customers/agencies — without the ability to touch pricing, approve KYC, change account status, send broadcasts, or manage other staff accounts (all enforced server-side, not just hidden in the UI; the Team page includes a capability matrix spelling out exactly what each role can and can't do). Like every other role, Support logs in with phone + OTP and simply can't self-register — only an existing Admin can create a staff account, from the Team page.

### Notification triggers (event-driven Email / SMS / WhatsApp / in-app alerts)

The Triggers page lets an Admin decide, per lifecycle event, which channels fire automatically and what each one says — without touching code. The six events are Sign Up, Login, Order Confirmed (the moment payment succeeds and dispatch starts), Order Completed, Delay in Order, and Order Cancelled; the four channels are Email, SMS, WhatsApp, and an in-app/push alert. Every (event, channel) pair starts with a sensible default (some on, some off) and an editable message template using `{{name}}`, `{{requestNumber}}`, `{{serviceName}}`, `{{amount}}`, `{{partnerName}}`, and `{{cancelReason}}` placeholders. A dispatch log on the same page shows every actual send attempt — sent, or skipped with a reason (e.g. "No email address on file") — so the admin can see what really happened, not just what's configured to happen.

"Delay in Order" is the one event nothing directly triggers: a background sweep (`delay-monitor.service.js`, every 2 minutes by default) checks every assigned-but-not-yet-arrived request against its estimated ETA plus a grace buffer (10 minutes by default, both configurable via `DELAY_SWEEP_INTERVAL_MS` / `DELAY_GRACE_BUFFER_MINUTES`) and fires the event once per request the first time it crosses that line.

**Scope note:** there's no Vahan (vehicle registration), government KYC document, or DigiLocker integration anywhere in this build — partner KYC is handled entirely through the existing Cashfree Secure ID adapter (mock-by-default, manual-admin-review either way), and that's intentionally the full extent of identity verification here.

The seed script creates ten demo requests spanning every lifecycle status — including one unassigned SOS and one `NO_PARTNER_FOUND` job specifically so the manual assign/reassign flow has something to act on immediately — plus matching confirmed payments, so Overview's revenue figures and the Live Map aren't empty on first run.

## The public website

`website/` is the public-facing marketing site — what a stranded driver, a prospective partner, or anyone evaluating the brand sees, as opposed to the operational dispatch console. It follows the same brand palette and typefaces as the admin dashboard exactly (same `tailwind.config.js` color tokens, same logo file) so the two feel like one product, not two separate projects bolted together.

It's not a static brochure: the live-stats strip (Verified Partners, Orders Served, Cities Live, Services Offered), the services grid, and the cities list all fetch from the real backend and re-render as that data changes — nothing on the page is hardcoded copy pretending to be current. The stats come from a new unauthenticated `GET /api/public/stats` endpoint (`backend/src/controllers/public.controller.js`) that's deliberately narrow in what it exposes: aggregate counts only, never a name, phone number, or any record-level detail, with its own rate limiter (`publicApiLimiter`, 60 req/min/IP) since unlike every other route in this API, nothing here requires a login to act as a natural throttle. The services and cities sections reuse the catalog endpoints (`GET /api/catalog/services`, `GET /api/catalog/cities`) that already existed and were already public.

The "Login" button in the nav and footer doesn't open a login form on this site — it's a link out to the admin dashboard (`VITE_PORTAL_URL` in `website/.env`), which is where Admin/Support/Agency accounts actually authenticate. Customers and partners don't get a web login at all in this build; that's intentionally mobile-app-only, matching how the rest of this system is built.

**App Store / Google Play badges:** the bottom-right floating widget and the in-page download section are placeholders, exactly as asked for, but deliberately *not* pixel reproductions of Apple's or Google's actual badge artwork — those are trademarked assets with brand guidelines governing their exact use. What's built instead is an original button design (the platform's name as plain text, a generic icon, this site's own typography) that signals "here's where the app will be" without copying anyone's protected mark. Once real App Store / Play Store listings exist, swap `StoreBadge` in `website/src/components/AppBadges.jsx` for the official badge images and links.

## Domain & subdomain architecture

You mentioned `/admin` and `subdomain.sos.ind.in` as two possible shapes for the URL structure — here's the recommendation this build is set up for, and why.

**Recommended: separate subdomains, not a path prefix.**

| Property | Suggested host | What it serves |
|---|---|---|
| Public website | `www.sos.ind.in` (or apex `sos.ind.in` redirecting to `www`) | `website/` |
| Staff/agency portal | `portal.sos.ind.in` | `admin-dashboard/` |
| Backend API | `api.sos.ind.in` | `backend/` |

Each of `website/` and `admin-dashboard/` is already a fully independent Vite single-page app with its own build, its own root-relative routing, and its own `index.html` — that's precisely what makes a subdomain the natural fit: deploy each one's `dist/` folder to its own static host (or the same host under different hostnames) with zero code changes, give each its own CDN/cache rules, and CORS stays simple (the backend's `CLIENT_ORIGIN` env var now accepts a comma-separated list specifically so it can allow both `https://www.sos.ind.in` and `https://portal.sos.ind.in` at once — see `backend/.env.example`).

**If you'd still rather serve the portal at `www.sos.ind.in/admin`** instead of a subdomain, it's possible but costs more: `admin-dashboard`'s `react-router-dom` routes would need a `basename="/admin"`, its `vite.config.js` would need `base: '/admin/'` so built asset paths resolve correctly, and your reverse proxy would need a rewrite rule forwarding `/admin/*` to that app's server while everything else goes to the website. None of that is done in this build — the subdomain path needs none of it, works today with what's already built, and is what most multi-property products on a shared domain actually do (compare `mail.google.com` / `drive.google.com` rather than `google.com/mail`).

Either way, **the actual domain registration and DNS records for `sos.ind.in` are outside what's buildable here** — `.ind.in` is a real ccTLD registered through India's NIXI-accredited registrars, not something any tool in this environment can provision. The above is the architecture to set up once you hold the domain, not a claim that it's already live.

## Tech stack

Backend: Node.js, Express, Socket.IO, JWT auth, Zod validation. Public website & admin dashboard: both React + Vite + Tailwind CSS, sharing the same brand tokens (Leaflet/Recharts are dashboard-only; the website stays dependency-light — just React, Vite, Tailwind, and axios). Mobile apps: Expo SDK 56 (React Native 0.85, React 19.2), React Navigation v7, `react-native-maps`, `expo-location`, `expo-notifications` (push), Socket.IO client. Database: PostgreSQL via Prisma in production (schema included); see "About the data layer" below for what's actually running in this build environment.

## Getting everything running locally

Start the backend first — everything else depends on it.

```bash
cd backend && npm install && cp .env.example .env && npm run seed && npm run dev
```

Then, in separate terminals:

```bash
cd website && npm install && npm run dev               # http://localhost:5174
cd admin-dashboard && npm install && npm run dev        # http://localhost:5173
cd mobile-customer-app && npm install && npx expo start
cd mobile-partner-app && npm install && npx expo start
```

Log into the dashboard as the seeded admin (`+911234500000`); log into either mobile app as a seeded customer/partner, or sign up fresh. With `OTP_DEBUG_MODE=true` (the default), every OTP request returns the code directly in the response instead of sending a real SMS, so none of this needs a phone or a third-party account to try end to end. See `backend/README.md` for the full seeded-account list.

On a physical phone, point the Expo apps at your computer's LAN IP instead of `localhost` (the phone's `localhost` is itself, not your machine) — `EXPO_PUBLIC_API_URL=http://192.168.1.50:4000 npx expo start`.

## Environment variables and going to production

`backend/.env.example` documents every variable; the short version is that everything is designed to run in mock mode with zero external accounts, and each integration upgrades independently the moment its keys are filled in.

SMS / OTP delivery (MSG91): set `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, and `MSG91_OTP_TEMPLATE_ID`, and set `OTP_DEBUG_MODE=false` so codes stop being echoed back in API responses. Until then, `src/integrations/sms.js` logs the OTP to the server console instead of sending it.

Push notifications (Expo Push Service): no API key needed — `src/integrations/push.js` calls Expo's push relay directly, which works the moment a device has a registered token. Both mobile apps request permission and register a token on login (`src/utils/registerPush.js` in each), but `Notifications.getExpoPushTokenAsync()` needs an EAS project ID to reliably resolve outside of Expo Go; once you run `eas init`, the resulting `extra.eas.projectId` in `app.json` is picked up automatically, no code change required.

Email: set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (works with an existing company mail server, Gmail Workspace, Office 365, or Amazon SES's SMTP interface) — or, if there's no SMTP relay available, set `RESEND_API_KEY` instead for a simpler HTTP-API-based send. SMTP takes priority if both are set. Until either is configured, `src/integrations/email.js` logs the rendered email to the server console instead of sending it. Either path runs every outgoing subject line through header-injection sanitization and every body through HTML-escaping, since both can contain admin-edited template text combined with user-controlled values like a customer's name.

Notification triggers tuning: `DELAY_SWEEP_INTERVAL_MS` (default 120000, how often the delay monitor checks active requests) and `DELAY_GRACE_BUFFER_MINUTES` (default 10, how far past a request's estimated ETA it has to go before being flagged "delayed"). For real WhatsApp delivery, MSG91's Business API only sends pre-approved templates, not the freeform text an admin types into the Triggers page — set `MSG91_WHATSAPP_GENERIC_TEMPLATE` to a template you've had approved with one body placeholder, or that channel stays mock-logged even with `MSG91_AUTH_KEY` set.

Payments (Razorpay): set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. On the backend side this switches `src/integrations/payment.js` from auto-succeeding mock orders to real order creation and signature verification. On the client side, both mobile apps currently call the confirm endpoint directly to simulate a successful checkout — swap that for `react-native-razorpay`'s checkout flow ahead of the confirm call, and use the signed `gatewayPaymentId`/`gatewaySignature` it returns instead of an empty body.

Partner KYC (Cashfree Secure ID): set `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`. Until then, `src/integrations/kyc.js` returns every submission as `PENDING_REVIEW` for an admin to manually approve or reject from the dashboard — which is a perfectly reasonable manual-review process to run permanently if you'd rather not depend on an automated verifier at all.

Maps (Google Maps Platform): set `GOOGLE_MAPS_SERVER_KEY` on the backend for distance/ETA calculations to use real road-network routing instead of straight-line (Haversine) distance, and put real API keys into both mobile apps' `app.json` (`ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey`) for `react-native-maps` to render. The admin dashboard's map uses OpenStreetMap tiles via Leaflet regardless and needs no key.

JWT and security: generate a real random `JWT_SECRET` (not the placeholder), keep `OTP_DEBUG_MODE=false` outside of demos, and set `CLIENT_ORIGIN` (currently defaults to `*`) to your real frontend origins once you have them — it accepts a comma-separated list, e.g. `CLIENT_ORIGIN=https://www.sos.ind.in,https://portal.sos.ind.in`, since the website and the admin portal are two separate origins in production.

Website config (`website/.env`, see `website/.env.example`): `VITE_API_URL` (the backend, same convention as the dashboard) and `VITE_PORTAL_URL` (where the "Login" button sends staff/agency users — point this at the deployed admin dashboard's URL).

**Dependency security:** all five projects (backend, website, admin-dashboard, both mobile apps) audit clean (`npm audit` reports zero vulnerabilities as of this build) after pinning a transitive `uuid` dependency to a patched version via `overrides` in both mobile apps and the backend, and bumping the admin dashboard's Vite/`@vitejs/plugin-react` to their current majors. Run `npm audit` again after any future `npm install` — the advisory database updates continuously, so a clean snapshot today doesn't guarantee a clean one in six months.

## About the data layer

`backend/prisma/schema.prisma` is the authoritative, fully documented relational schema — 18 models covering every entity in the product. `database/schema.sql` is a hand-written Postgres mirror of that exact schema, with the same tables, columns, enums, and indexes, ready to run with `psql -f database/schema.sql`.

The backend you're actually running, though, talks to neither of those. This build environment blocks the Prisma engine binary download (and native module compilation generally), so the running demo uses a small embedded JSON-file store (`backend/src/db/store.js`) behind a repository layer (`backend/src/repositories/*.js`) that exposes the exact same function signatures a Prisma-backed implementation would. Every controller in the app calls these repository functions, not the store directly — which means moving to Postgres is a swap underneath an unchanged interface, not a rewrite:

1. Point `DATABASE_URL` at a real Postgres instance and run `npx prisma generate && npx prisma db push`.
2. Reimplement each repository file's exported functions using `@prisma/client` queries in place of the `db.*` JSON-store calls, keeping the same function names and return shapes.
3. Delete `backend/data/db.json` (the demo data file) and re-seed against the real database.

## Deployment notes

**Want to actually deploy this, step by step?** See **`FOUNDER_DEPLOY_GUIDE.md`** (one-click, no technical background needed — click a button on Render, paste two web addresses, done) or **`DEPLOYMENT.md`** (the longer version, covering each piece individually and what to do once you're past the demo stage). What follows below is the architectural reasoning, not a walkthrough.

Containerize each app independently — the backend is a stateless Node process once it's backed by Postgres, so it horizontally scales behind a load balancer with no code changes beyond moving the in-memory dispatch offer queue (`backend/src/services/dispatch.service.js`) into Redis, which is the one piece of server state that currently assumes a single process. A typical production layout is the backend and a Postgres instance (managed RDS/Cloud SQL or self-hosted) plus Redis on a small VM or container service, the admin dashboard as a static build served from any CDN/static host (it's a pure Vite SPA — `npm run build` produces `dist/`), and the two Expo apps built and submitted through EAS Build for the App Store and Play Store once you're past Expo Go testing.

## Security notes

Every endpoint that isn't explicitly public requires a valid JWT, and role checks happen server-side on every route, not just hidden in the UI — a customer's token can't call partner or admin endpoints no matter what the app sends. Request ownership is checked on every read too: a customer can only ever see their own requests, a partner only the one they're assigned to, so changing an ID in a request won't leak someone else's booking. OTP verification has its own 5-attempt lockout independent of the general rate limiter, and the general OTP-request rate limiter exists specifically to stop SMS-bombing abuse. None of this replaces a real security review before going to production — add audit logging retention policies, rotate the JWT secret on a schedule, and put the webhook endpoint behind real Razorpay signature verification (the mock adapter accepts anything, which is correct for demos and wrong for production).

## Multi-city and catalog notes

Service types and pricing rules are rows in the database, editable from the admin dashboard's Pricing page — adding "Windshield Repair" to the catalog or launching in Mumbai with its own surge multiplier is a few clicks, not a deploy. The one thing that's still a manual step is seeding a new city's initial partner pool, since partners self-register; everything downstream of that (matching, pricing, dispatch) already reads `cityId` and scopes correctly.
