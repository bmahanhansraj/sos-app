const db = require('../db/store');
const { newId } = require('../utils/helpers');

function getIOSafe() {
  try {
    return require('../sockets').getIO();
  } catch {
    return null;
  }
}

function create({ userId, type, title, body, data }) {
  const notification = db.insert('notifications', {
    id: newId(),
    userId,
    type,
    title,
    body,
    data: data ? JSON.stringify(data) : null,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  const io = getIOSafe();
  if (io) io.to(`user:${userId}`).emit('notification:new', { notification });

  return notification;
}

function listForUser(userId, { unreadOnly = false } = {}) {
  return db
    .find('notifications', (n) => n.userId === userId && (!unreadOnly || !n.isRead))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markRead(id) {
  return db.update('notifications', id, { isRead: true });
}

module.exports = { create, listForUser, markRead };
