// ============================================================================
// MSG91 integration adapter
// ----------------------------------------------------------------------------
// Covers: SMS OTP delivery, WhatsApp messages, and push notification relay.
// If MSG91_AUTH_KEY is not set in .env, every call is short-circuited into
// a "mock" mode: nothing is sent over the network, the message is logged to
// the console, and (only when OTP_DEBUG_MODE=true) the OTP code is echoed
// back in the API response so the app can be demoed end-to-end without a
// real MSG91 account.
//
// To go live: sign up at https://msg91.com, set MSG91_AUTH_KEY + a sender
// id / OTP template id in .env, and this file's `sendSms` / `sendWhatsapp`
// functions will call the real MSG91 REST API instead.
// ============================================================================

const isMock = () => !process.env.MSG91_AUTH_KEY;

async function sendSms(phone, message) {
  if (isMock()) {
    console.log(`[MSG91:MOCK][SMS -> ${phone}] ${message}`);
    return { ok: true, mock: true };
  }

  const resp = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: process.env.MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      sender: process.env.MSG91_SENDER_ID,
      template_id: process.env.MSG91_OTP_TEMPLATE_ID,
      mobiles: phone.replace('+', ''),
      message,
    }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, raw: data };
}

async function sendOtpSms(phone, code) {
  return sendSms(phone, `Your SoS - Services On Site verification code is ${code}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes. Do not share this code.`);
}

async function sendWhatsapp(phone, templateName, params = {}) {
  if (isMock()) {
    console.log(`[MSG91:MOCK][WhatsApp -> ${phone}] template=${templateName} params=${JSON.stringify(params)}`);
    return { ok: true, mock: true };
  }
  const resp = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: process.env.MSG91_AUTH_KEY },
    body: JSON.stringify({
      integrated_number: process.env.MSG91_WHATSAPP_NAMESPACE,
      to: phone.replace('+', ''),
      type: 'template',
      template: { name: templateName, params },
    }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, raw: data };
}

async function sendWhatsappText(phone, message) {
  if (isMock()) {
    console.log(`[MSG91:MOCK][WhatsApp -> ${phone}] ${message}`);
    return { ok: true, mock: true };
  }
  // MSG91's live WhatsApp Business API only delivers pre-approved templates,
  // not arbitrary text -- so an admin-edited freeform rule body can't be
  // sent as-is once this goes live. This passes it through a generic
  // single-variable template (configure MSG91_WHATSAPP_GENERIC_TEMPLATE to
  // a template you've had approved with one body placeholder); if that
  // env var isn't set, this falls back to mock-logging with a warning
  // rather than silently failing or sending nothing.
  const templateName = process.env.MSG91_WHATSAPP_GENERIC_TEMPLATE;
  if (!templateName) {
    console.warn(
      `[MSG91] MSG91_WHATSAPP_GENERIC_TEMPLATE not set -- cannot send freeform WhatsApp text live. Logging instead: -> ${phone}: ${message}`
    );
    return { ok: false, mock: true, reason: 'MSG91_WHATSAPP_GENERIC_TEMPLATE not configured' };
  }
  return sendWhatsapp(phone, templateName, { body: message });
}

module.exports = { sendSms, sendOtpSms, sendWhatsapp, sendWhatsappText, isMock };
