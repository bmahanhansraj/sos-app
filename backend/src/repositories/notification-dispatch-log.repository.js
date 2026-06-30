const db = require('../db/store');
const { newId } = require('../utils/helpers');

function log({ event, channel, userId, requestId, recipient, subject, message, ok, reason }) {
  return db.insert('notificationDispatchLog', {
    id: newId(),
    event,
    channel,
    userId: userId || null,
    requestId: requestId || null,
    recipient: recipient || null,
    subject: subject || null,
    message,
    ok,
    reason: reason || null,
    createdAt: new Date().toISOString(),
  });
}

function listRecent(limit = 100) {
  return db
    .all('notificationDispatchLog')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

module.exports = { log, listRecent };
