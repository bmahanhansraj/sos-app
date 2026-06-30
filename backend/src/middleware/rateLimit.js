const rateLimit = require('express-rate-limit');

// Throttle OTP *send* requests to prevent SMS-bombing / abuse. This only
// guards /otp/request (which costs a real SMS in production) -- /otp/verify
// is deliberately NOT covered by this limiter; brute-forcing a single code
// is already capped by the 5-attempt lockout in otp.repository.js, and an
// admin/partner/customer testing multiple roles from the same demo machine
// (same IP) would otherwise get needlessly locked out.
//
// Tuned generously (20/10min) for a small multi-role demo on one IP; in
// production also key this by phone number, not just IP, to stop someone
// spraying OTP requests across many numbers from one connection.
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please try again later.' },
});

// /api/public/* has no auth token to act as a natural throttle (every other
// route requires a logged-in user), and it's meant to be hit by the public
// marketing website on every page load -- this keeps a single IP from
// hammering it without blocking normal traffic. Generous since the
// underlying query is cheap and already has a 30s Cache-Control hint.
const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

module.exports = { otpRequestLimiter, publicApiLimiter };
