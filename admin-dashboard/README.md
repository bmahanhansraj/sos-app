# SoS Admin Dashboard — Dispatch Console

A dark, data-dense ops console for the SoS team: live map, request lifecycle management, partner KYC approvals, and pricing configuration.

## Setup

```bash
cd admin-dashboard
npm install
cp .env.example .env   # point VITE_API_URL at your backend if not localhost:4000
npm run dev             # http://localhost:5173
```

The backend must be running first (see `../backend/README.md` or the root README). Log in with any seeded admin phone number, e.g. `+911234500000` — in demo mode (`OTP_DEBUG_MODE=true`) the OTP is shown directly on the login screen instead of being sent by SMS.

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## Design system

This is the "dispatch console" look, built on the same SoS brand used everywhere else in this repo (the public website, the logo itself): near-black charcoal surfaces (`void`/`panel`/`panel-raised`), a single amber/hazard-beacon accent (`beacon`, `#FFC107`) for primary actions, live/in-motion states, and anything that should read as "active," and the brand red (`danger`, `#E53935`) reserved for SOS/cancelled/destructive states. Poppins carries both headers and body copy, Montserrat is reserved for the logo wordmark, and JetBrains Mono is used for anything that reads as data — IDs, OTPs, coordinates, money, license plates.

The signature element is the **beacon chip**: a small colored dot plus label used for every status value in the system (request lifecycle, KYC, payments). States that are actively "in motion" (en route, in progress, pending review) get a soft pulse on the dot (`.beacon-dot.is-live` in `index.css`) — this is the one motion accent in most of the UI, and it respects `prefers-reduced-motion`. The Live Map page additionally uses a slow radar-style sweep, kept exclusive to that page so it stays a distinguishing touch rather than a repeated motif.

## Pages

Overview gives a 15-second-polling snapshot of request volume, completion rate, revenue, and partner availability, plus a 14-day requests/revenue trend chart. Live map plots online partners and active requests on a dark-tiled Leaflet map, color-coded by status, updated in real time over the same Socket.IO connection the mobile apps use. Requests lists every request with status/SOS filters and a detail drawer that shows full status history and lets an admin manually assign or reassign a partner, overriding the automatic nearest-partner dispatch. Partners surfaces the KYC approval queue front and center, with a searchable, fleet-filterable directory below showing online/availability, rating, and earnings. Users covers customer and partner account management (name/email/status). Fleets is where RSA agencies are onboarded, with each fleet's actual partner roster visible inline, not just a headcount. Cities adds service areas with a search-as-you-type place lookup and a circular geofence (center + radius) previewed live on a map. Pricing lets the team add new service types and city-specific pricing or surge rules — including editing or disabling a rule after creation — without a code deploy, which is what makes multi-city expansion a config change rather than a release. Notifications sends one-off broadcasts to everyone, a segment, or one specific person. Triggers configures the *automatic* side of notifications instead — which of Email/SMS/WhatsApp/in-app-alert fire for Sign Up, Login, Order Confirmed, Order Completed, Delay in Order, and Order Cancelled, with editable message templates and a dispatch log showing what actually sent. Team (Admin-only) manages staff accounts and documents the Admin-vs-Support capability split. Audit Log (Admin-only) lists every sensitive action across the system with who did it and when.
