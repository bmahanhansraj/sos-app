const db = require('../db/store');
const { newId } = require('../utils/helpers');

function create({ requestId, senderId, message }) {
  return db.insert('chatMessages', {
    id: newId(),
    requestId,
    senderId,
    message,
    createdAt: new Date().toISOString(),
  });
}

function listForRequest(requestId) {
  return db
    .find('chatMessages', (m) => m.requestId === requestId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

module.exports = { create, listForRequest };
