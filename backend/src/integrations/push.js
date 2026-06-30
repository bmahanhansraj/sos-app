// ============================================================================
// Push notification integration (Expo Push Service)
// ----------------------------------------------------------------------------
// Both mobile apps are Expo apps, so we send push notifications through
// Expo's push service rather than talking to FCM/APNs directly -- it's free,
// requires no separate account or service-account key, and works the moment
// a device registers an Expo push token (stored on User.fcmToken despite the
// name, which predates this implementation).
//
// If a user has no token registered yet (hasn't opened the app on a real
// device, or push permission was denied), this is a no-op rather than an
// error -- in-app notifications and the admin dashboard's live feed already
// cover that user through other channels.
// ============================================================================

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token) {
  return typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

/** Send a push notification to a single device token. */
async function sendPush(token, { title, body, data = {} }) {
  if (!token) return { ok: false, reason: 'NO_TOKEN' };
  if (!isExpoPushToken(token)) {
    console.log(`[PUSH:SKIP] ${token.slice(0, 12)}... is not an Expo push token`);
    return { ok: false, reason: 'NOT_EXPO_TOKEN' };
  }
  return sendBatch([token], { title, body, data });
}

/** Send the same push notification to many device tokens in one batched call. */
async function sendBatch(tokens, { title, body, data = {} }) {
  const validTokens = tokens.filter(isExpoPushToken);
  if (validTokens.length === 0) return { ok: true, sent: 0 };

  const messages = validTokens.map((to) => ({ to, title, body, data, sound: 'default' }));
  try {
    const resp = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, sent: validTokens.length, raw: json };
  } catch (err) {
    console.log(`[PUSH:ERROR] ${err.message}`);
    return { ok: false, sent: 0, error: err.message };
  }
}

module.exports = { sendPush, sendBatch, isExpoPushToken };
