# SoS Customer App

The rider-facing app: book roadside assistance, track your partner live, and pay upfront.

## Setup

```bash
cd mobile-customer-app
npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS), or press `a` / `i` for an emulator/simulator. The backend must already be running — see `../backend/README.md`.

By default the app points at `http://localhost:4000`, which works in the iOS simulator and web preview. On a physical device, `localhost` means the phone itself, not your computer — set `EXPO_PUBLIC_API_URL` to your machine's LAN IP instead, e.g.:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000 npx expo start
```

Sign up with any phone number (e.g. `+919876500001`); in demo mode the OTP is shown on screen instead of sent by SMS.

## What's real vs. mocked here

GPS (via `expo-location`), live map tracking (`react-native-maps`), and in-app chat all talk to the real backend over REST + Socket.IO. Payment uses the backend's mock-mode Razorpay adapter — the "Pay" button calls the same confirm endpoint a real Razorpay checkout success callback would call. To go live, swap in `react-native-razorpay`'s checkout flow ahead of that confirm call and add your Razorpay key to the backend's `.env`.

## Design

Light, "daylight highway" theme: warm off-white surfaces, a safety-vest amber for primary actions, and a reserved red used only for genuine emergencies — the SOS button never shares its color with routine states like a cancelled booking. Manrope carries headers, Inter carries body copy. The one signature motion touch is a soft pulse on the status dot while something is actively happening (searching for a partner, en route, mid-job) — calm rather than alarming, and it respects reduced-motion settings.
