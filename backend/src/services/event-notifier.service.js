// ============================================================================
// Event notifier service
// ----------------------------------------------------------------------------
// The single place every lifecycle event (Sign Up, Login, Order Confirmed,
// Order Completed, Order Delayed, Order Cancelled) goes through. Controllers
// don't talk to email/SMS/WhatsApp/push directly for these events -- they
// just call `fireEvent(eventKey, { user, request, extra })` here, and this
// service looks up which channels the admin has switched on for that event
// (via the NotificationRules dashboard page) and sends through each one.
//
// Every attempt -- sent, skipped, or failed -- is written to the dispatch
// log so the admin can see what actually happened, not just what's
// configured to happen.
// ============================================================================

const ruleRepo = require('../repositories/notification-rule.repository');
const dispatchLogRepo = require('../repositories/notification-dispatch-log.repository');
const notificationRepo = require('../repositories/notification.repository');
const email = require('../integrations/email');
const sms = require('../integrations/sms');
const push = require('../integrations/push');

/** Replaces {{var}} placeholders; unknown variables render as empty string rather than leaking "{{x}}" into a real message. */
function render(template, vars) {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''));
}

function buildVars({ user, request, extra }) {
  return {
    name: user?.name || 'there',
    phone: user?.phone || '',
    email: user?.email || '',
    requestNumber: request?.requestNumber || '',
    serviceName: extra?.serviceName || '',
    amount: request?.finalPrice ?? request?.estimatedPrice ?? '',
    partnerName: extra?.partnerName || '',
    cancelReason: request?.cancelReason ? `Reason: ${request.cancelReason}` : '',
    ...extra,
  };
}

/**
 * Fires `event` for `user`, sending through every channel the admin has
 * enabled for it. Safe to call even when a user has no email/phone/push
 * token on file -- channels that can't be satisfied are logged as skipped,
 * not thrown as errors, so a missing email address on one customer never
 * breaks the rest of the request lifecycle.
 */
async function fireEvent(event, { user, request, extra = {} } = {}) {
  if (!user) return { fired: 0 };

  const rules = ruleRepo.enabledFor(event);
  if (rules.length === 0) return { fired: 0 };

  const vars = buildVars({ user, request, extra });
  let fired = 0;

  for (const rule of rules) {
    const subject = render(rule.subject, vars);
    const message = render(rule.message, vars);

    try {
      if (rule.channel === 'EMAIL') {
        if (!user.email) {
          dispatchLogRepo.log({ event, channel: 'EMAIL', userId: user.id, requestId: request?.id, ok: false, reason: 'No email address on file', message });
          continue;
        }
        const result = await email.sendEmail({ to: user.email, subject, html: message });
        dispatchLogRepo.log({ event, channel: 'EMAIL', userId: user.id, requestId: request?.id, recipient: user.email, subject, message, ok: result.ok, reason: result.reason });
      } else if (rule.channel === 'SMS') {
        if (!user.phone) {
          dispatchLogRepo.log({ event, channel: 'SMS', userId: user.id, requestId: request?.id, ok: false, reason: 'No phone number on file', message });
          continue;
        }
        const result = await sms.sendSms(user.phone, message);
        dispatchLogRepo.log({ event, channel: 'SMS', userId: user.id, requestId: request?.id, recipient: user.phone, message, ok: result.ok, reason: result.reason });
      } else if (rule.channel === 'WHATSAPP') {
        if (!user.phone) {
          dispatchLogRepo.log({ event, channel: 'WHATSAPP', userId: user.id, requestId: request?.id, ok: false, reason: 'No phone number on file', message });
          continue;
        }
        const result = await sms.sendWhatsappText(user.phone, message);
        dispatchLogRepo.log({ event, channel: 'WHATSAPP', userId: user.id, requestId: request?.id, recipient: user.phone, message, ok: result.ok, reason: result.reason });
      } else if (rule.channel === 'ALERT') {
        notificationRepo.create({ userId: user.id, type: 'SYSTEM', title: subject || message.slice(0, 60), body: message, data: request ? { requestId: request.id } : undefined });
        if (user.fcmToken) await push.sendPush(user.fcmToken, { title: subject || message.slice(0, 60), body: message, data: request ? { requestId: request.id } : {} });
        dispatchLogRepo.log({ event, channel: 'ALERT', userId: user.id, requestId: request?.id, recipient: user.id, message, ok: true });
      }
      fired += 1;
    } catch (err) {
      dispatchLogRepo.log({ event, channel: rule.channel, userId: user.id, requestId: request?.id, message, ok: false, reason: err.message });
    }
  }

  return { fired };
}

module.exports = { fireEvent, render };
