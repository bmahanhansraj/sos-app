const db = require('../db/store');
const { newId } = require('../utils/helpers');

function log({ actorId, action, entityType, entityId, details }) {
  return db.insert('auditLogs', {
    id: newId(),
    actorId,
    action,
    entityType,
    entityId,
    details: details ? JSON.stringify(details) : null,
    createdAt: new Date().toISOString(),
  });
}

function listRecent(limit = 100) {
  return db
    .all('auditLogs')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

module.exports = { log, listRecent };
