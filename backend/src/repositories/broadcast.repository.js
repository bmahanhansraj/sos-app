const db = require('../db/store');
const { newId } = require('../utils/helpers');

function create({ title, body, audience, sentById, recipientCount, pushSentCount, targetUserId }) {
  return db.insert('broadcasts', {
    id: newId(),
    title,
    body,
    audience,
    targetUserId: targetUserId || null,
    sentById,
    recipientCount,
    pushSentCount,
    sentAt: new Date().toISOString(),
  });
}

function listRecent(limit = 50) {
  return db
    .all('broadcasts')
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, limit);
}

module.exports = { create, listRecent };
