# SoS Website — Public Marketing Site

The public-facing site at (eventually) `www.sos.ind.in` — what a stranded driver, a prospective partner, or anyone evaluating the brand sees. Not the operations console (that's `../admin-dashboard`); this is the front door.

## Setup

```bash
cd website
npm install
cp .env.example .env   # point VITE_API_URL / VITE_PORTAL_URL if not using the defaults
npm run dev             # http://localhost:5174
```

The backend must be running first (see `../backend/README.md` or the root README) — the live-stats strip, services grid, and cities list all fetch real data from it on load.

```bash
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

## What's on the page

A hero with a pulsing radar-beacon visual (the one bold motion element on the page — everything else stays restrained), a live stats strip (Verified Partners / Orders Served / Cities Live / Services Offered, fetched from `GET /api/public/stats` and refreshed every 30s), a services grid and a cities list both pulled from the real catalog API rather than hardcoded, a genuinely sequential 4-step "how it works," a partner-recruitment band, and an app-download section with App Store / Google Play placeholder badges (see below). None of the live sections fabricate a number if the backend is unreachable — they show a plain `—` and a quiet "temporarily unavailable" note instead of guessing.

The floating bottom-right widget repeats the app badges and can be dismissed; it reappears on the next page load (no persistence — these are placeholders, not a real nag screen).

## Login

The "Login" button doesn't open a form on this site — it's a link to wherever the admin dashboard is deployed (`VITE_PORTAL_URL`). Customers and partners don't get a web login in this build at all; that's mobile-app-only by design. See the root README's "Domain & subdomain architecture" section for the recommended way to host the website and the portal as separate subdomains.

## App Store / Google Play badges

These are intentionally original placeholder buttons (`src/components/AppBadges.jsx`) — plain text platform names plus a generic icon, not reproductions of Apple's or Google's actual trademarked badge artwork. Swap them for the real official badges and links once app store listings exist.

## Design system

Same brand as the rest of this repo, exactly — same `tailwind.config.js` color tokens (`void`/`panel`/`beacon`/`danger`/etc.) and the same logo file as `admin-dashboard`, so the public site and the portal read as one product. Poppins for display and body text, Montserrat reserved for the logo wordmark, JetBrains Mono for anything numeric (the live stat counters, prices). The signature element is the hero's radar-beacon — concentric rings pinging outward from a center marker, visualizing the core promise ("we find help near you, live") rather than being decoration for its own sake; it's the one place this page spends its motion budget; everything else uses a single restrained scroll-reveal.
