// ============================================================================
// Notification rules repository
// ----------------------------------------------------------------------------
// Backs the admin-configurable "when should we trigger Email / SMS /
// WhatsApp / in-app Alert" matrix for lifecycle events (Sign Up, Login,
// Order Confirmed, Order Completed, Order Delayed, Order Cancelled).
//
// Each (event, channel) pair is one row, addressed by a deterministic id
// (`"ORDER_CONFIRMED:EMAIL"`) rather than a random uuid -- there's a fixed,
// known set of rows, so this lets the API be a simple "list + patch" rather
// than needing create/delete endpoints for rows that should always exist.
// ============================================================================

const db = require('../db/store');

const EVENTS = ['SIGNUP', 'LOGIN', 'ORDER_CONFIRMED', 'ORDER_COMPLETED', 'ORDER_DELAYED', 'ORDER_CANCELLED'];
const CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'ALERT'];

function ruleId(event, channel) {
  return `${event}:${channel}`;
}

// Sensible starting defaults so the matrix isn't all-off (and therefore
// silently doing nothing) the first time an admin opens this page. Admins
// can disable any of these afterward.
const DEFAULT_ENABLED = new Set([
  'SIGNUP:EMAIL', 'SIGNUP:ALERT',
  'LOGIN:ALERT',
  'ORDER_CONFIRMED:SMS', 'ORDER_CONFIRMED:EMAIL', 'ORDER_CONFIRMED:ALERT',
  'ORDER_COMPLETED:EMAIL', 'ORDER_COMPLETED:ALERT',
  'ORDER_DELAYED:SMS', 'ORDER_DELAYED:WHATSAPP', 'ORDER_DELAYED:ALERT',
  'ORDER_CANCELLED:SMS', 'ORDER_CANCELLED:ALERT',
]);

const DEFAULT_TEMPLATES = {
  'SIGNUP:EMAIL': { subject: 'Welcome to SoS - Services On Site', message: 'Hi {{name}}, your account is ready. You can now request roadside help any time, anywhere.' },
  'SIGNUP:SMS': { subject: null, message: 'Welcome to SoS, {{name}}! Your account is ready.' },
  'SIGNUP:WHATSAPP': { subject: null, message: 'Welcome to SoS, {{name}}! Your account is ready.' },
  'SIGNUP:ALERT': { subject: null, message: 'Welcome to SoS, {{name}}!' },
  'LOGIN:EMAIL': { subject: 'New login to your SoS account', message: 'Hi {{name}}, we noticed a new login to your account just now. If this wasn\'t you, please contact support immediately.' },
  'LOGIN:SMS': { subject: null, message: 'New login to your SoS account just now. Not you? Contact support.' },
  'LOGIN:WHATSAPP': { subject: null, message: 'New login to your SoS account just now. Not you? Contact support.' },
  'LOGIN:ALERT': { subject: null, message: 'New login to your account just now.' },
  'ORDER_CONFIRMED:EMAIL': { subject: 'Your SoS request {{requestNumber}} is confirmed', message: 'Hi {{name}}, your request for {{serviceName}} (₹{{amount}}) is confirmed and we\'re finding you a partner now.' },
  'ORDER_CONFIRMED:SMS': { subject: null, message: 'SoS request {{requestNumber}} confirmed. Finding a partner for your {{serviceName}} now.' },
  'ORDER_CONFIRMED:WHATSAPP': { subject: null, message: 'Your SoS request {{requestNumber}} for {{serviceName}} is confirmed. Finding you a partner now.' },
  'ORDER_CONFIRMED:ALERT': { subject: null, message: 'Request {{requestNumber}} confirmed — finding you a partner.' },
  'ORDER_COMPLETED:EMAIL': { subject: 'Your SoS request {{requestNumber}} is complete', message: 'Hi {{name}}, your {{serviceName}} service is complete. Final amount: ₹{{amount}}. Please rate your experience!' },
  'ORDER_COMPLETED:SMS': { subject: null, message: 'SoS request {{requestNumber}} complete. Final amount ₹{{amount}}. Please rate your experience!' },
  'ORDER_COMPLETED:WHATSAPP': { subject: null, message: 'Your SoS request {{requestNumber}} is complete. Final amount ₹{{amount}}. Please rate your experience!' },
  'ORDER_COMPLETED:ALERT': { subject: null, message: 'Request {{requestNumber}} complete. Please rate your experience.' },
  'ORDER_DELAYED:EMAIL': { subject: 'Update on your SoS request {{requestNumber}}', message: 'Hi {{name}}, your partner for request {{requestNumber}} is taking longer than estimated. We\'re monitoring this closely -- thank you for your patience.' },
  'ORDER_DELAYED:SMS': { subject: null, message: 'Your SoS request {{requestNumber}} is taking longer than expected. We\'re on it -- thanks for your patience.' },
  'ORDER_DELAYED:WHATSAPP': { subject: null, message: 'Your SoS request {{requestNumber}} is taking longer than expected. We\'re on it -- thanks for your patience.' },
  'ORDER_DELAYED:ALERT': { subject: null, message: 'Request {{requestNumber}} is delayed — we\'re monitoring it.' },
  'ORDER_CANCELLED:EMAIL': { subject: 'Your SoS request {{requestNumber}} was cancelled', message: 'Hi {{name}}, your request {{requestNumber}} has been cancelled. {{cancelReason}}' },
  'ORDER_CANCELLED:SMS': { subject: null, message: 'SoS request {{requestNumber}} cancelled. {{cancelReason}}' },
  'ORDER_CANCELLED:WHATSAPP': { subject: null, message: 'Your SoS request {{requestNumber}} has been cancelled. {{cancelReason}}' },
  'ORDER_CANCELLED:ALERT': { subject: null, message: 'Request {{requestNumber}} cancelled.' },
};

let defaultsEnsured = false;

/** Idempotently creates any missing (event, channel) rows with their defaults. Safe to call on every server start. */
function ensureDefaults() {
  if (defaultsEnsured) return;
  for (const event of EVENTS) {
    for (const channel of CHANNELS) {
      const id = ruleId(event, channel);
      if (!db.findById('notificationRules', id)) {
        const tmpl = DEFAULT_TEMPLATES[id] || { subject: null, message: '' };
        db.insert('notificationRules', {
          id,
          event,
          channel,
          enabled: DEFAULT_ENABLED.has(id),
          subject: tmpl.subject,
          message: tmpl.message,
          updatedAt: new Date().toISOString(),
          updatedBy: null,
        });
      }
    }
  }
  defaultsEnsured = true;
}

function listAll() {
  ensureDefaults();
  return db.all('notificationRules').sort((a, b) => EVENTS.indexOf(a.event) - EVENTS.indexOf(b.event) || a.channel.localeCompare(b.channel));
}

function findById(id) {
  return db.findById('notificationRules', id);
}

function update(id, patch, actorId) {
  return db.update('notificationRules', id, { ...patch, updatedAt: new Date().toISOString(), updatedBy: actorId || null });
}

/** Enabled rules for a given event, used by the dispatcher at the moment an event actually fires. */
function enabledFor(event) {
  ensureDefaults();
  return db.find('notificationRules', (r) => r.event === event && r.enabled);
}

module.exports = { EVENTS, CHANNELS, ruleId, ensureDefaults, listAll, findById, update, enabledFor };
