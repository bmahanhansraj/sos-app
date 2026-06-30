// ============================================================================
// Email integration adapter
// ----------------------------------------------------------------------------
// Used by the event-driven notification rules engine (Sign Up, Login, Order
// Confirmed/Completed/Delayed/Cancelled). Three modes, checked in this order:
//
//   1. SMTP (nodemailer) -- set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
//      This is the universal path: works against an existing company mail
//      server, Gmail Workspace, Office 365, Amazon SES's SMTP interface, or
//      any other provider's SMTP relay, without depending on one vendor's
//      proprietary HTTP API.
//   2. Resend (HTTP API) -- set RESEND_API_KEY instead, if there's no SMTP
//      relay available but a Resend account exists. Simpler to set up than
//      SMTP credentials, no mail server needed.
//   3. Mock -- if neither is configured, every call is logged to the
//      console instead of sent, so the feature is fully demoable and the
//      dispatch log gets populated without any real email account.
//
// The rest of the app only ever calls `sendEmail({ to, subject, html })`
// and never knows which of the three actually ran.
// ============================================================================

const SMTP_CONFIGURED = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const RESEND_CONFIGURED = () => !!process.env.RESEND_API_KEY;

const isMock = () => !SMTP_CONFIGURED() && !RESEND_CONFIGURED();

function activeMode() {
  if (SMTP_CONFIGURED()) return 'SMTP';
  if (RESEND_CONFIGURED()) return 'RESEND';
  return 'MOCK';
}

const FROM_ADDRESS = () => process.env.EMAIL_FROM_ADDRESS || 'SoS Services On Site <noreply@sos-app.demo>';

// Wraps a plain-text/template-rendered message in a minimal HTML shell and
// escapes it -- the rules engine's templates are plain strings (admin-edited
// in a <textarea>, not a rich editor), so without this, a stray "<" or "&"
// in a customer's name or a cancellation reason could mangle the rendered
// email, and an admin pasting something with "<script>" into a message
// field would otherwise inject raw HTML into every email that rule sends.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapHtml(message) {
  const safe = escapeHtml(message).replace(/\n/g, '<br>');
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #1a1a1a; max-width: 480px;">${safe}</div>`;
}

let smtpTransport = null;
function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  // Lazy require: nodemailer is a real dependency now, but only ever
  // touched when SMTP is actually configured, so mock-mode and
  // Resend-mode demos don't pay for loading it.
  const nodemailer = require('nodemailer');
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // true for port 465, false for 587/STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return smtpTransport;
}

async function sendViaSmtp({ to, subject, html }) {
  const transport = getSmtpTransport();
  const info = await transport.sendMail({ from: FROM_ADDRESS(), to, subject, html });
  return { ok: true, raw: { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected } };
}

async function sendViaResend({ to, subject, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS(), to: [to], subject, html }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, raw: data };
}

// Strips newlines/control characters from a header value. Subject text is
// built from admin-editable templates that can embed user-controlled
// fields ({{name}}, {{cancelReason}}) which aren't validated against
// newlines anywhere upstream -- without this, a crafted name or
// cancellation reason could attempt classic SMTP header injection
// (sneaking extra headers like Bcc: into the Subject line).
function sanitizeHeaderValue(str) {
  return String(str).replace(/[\r\n]+/g, ' ').trim();
}

async function sendEmail({ to, subject, html }) {
  if (!to) return { ok: false, reason: 'No recipient email on file' };

  const safeSubject = sanitizeHeaderValue(subject || 'Update from SoS - Services On Site');
  const wrappedHtml = wrapHtml(html);

  const mode = activeMode();
  if (mode === 'MOCK') {
    console.log(`[Email:MOCK -> ${to}] subject="${safeSubject}"\n${html}`);
    return { ok: true, mock: true };
  }

  try {
    if (mode === 'SMTP') return await sendViaSmtp({ to, subject: safeSubject, html: wrappedHtml });
    return await sendViaResend({ to, subject: safeSubject, html: wrappedHtml });
  } catch (err) {
    console.error(`[Email:${mode}] send failed:`, err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = { sendEmail, isMock, activeMode, escapeHtml, sanitizeHeaderValue };
