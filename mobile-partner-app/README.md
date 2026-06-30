# SoS Partner App

The service-partner app: go online, accept nearby jobs, navigate to the customer, and get paid.

## Setup

```bash
cd mobile-partner-app
npm install
npx expo start
```

The backend must already be running — see `../backend/README.md`. On a physical device set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (not `localhost`), the same way as the customer app.

Sign up with any phone number, e.g. `+919876512345` (the seed script's online demo partners are `+911234512001` through `...007` if you want to log in as an already-approved partner instead of going through KYC). In demo mode the OTP is shown on screen.

## Flow

A new partner signs up, submits KYC (document type, number, vehicle details, and a photo — there's no real object storage wired up in this demo, so the photo capture is real but the upload is a placeholder reference), and waits for admin approval from the dashboard. Once approved, the home screen's online toggle becomes active; going online immediately pushes a GPS fix to the backend and keeps pushing one every ~10 seconds or 25 meters of movement, because dispatch matching only considers partners with a known current location.

Job offers arrive as a full-screen modal from anywhere in the app (a global socket listener, not a navigated screen) with a 45-second countdown; letting it run out silently declines so the job moves to the next-nearest partner. Accepting drops the partner into the active-job screen, which walks through en route → arrived → in progress → completion, the last step gated by the OTP the customer reads aloud.

## Design

Dark navy, built to be glanced at in daylight or while moving — this is a working tool, not a storefront. It shares the same amber brand accent as the customer app so the two clearly belong to one product, but Space Grotesk replaces Manrope for headers to give the partner app a slightly more technical, operational feel. Online status uses green (the universal "available" convention in driver-facing apps); red is reserved for SOS jobs and cancellations only.
