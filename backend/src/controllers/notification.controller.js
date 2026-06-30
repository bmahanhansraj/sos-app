const notificationRepo = require('../repositories/notification.repository');
const { asyncHandler } = require('../utils/asyncHandler');

/** GET /api/notifications */
const listMine = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  res.json({ notifications: notificationRepo.listForUser(req.user.id, { unreadOnly }) });
});

/** POST /api/notifications/:id/read */
const markRead = asyncHandler(async (req, res) => {
  const updated = notificationRepo.markRead(req.params.id);
  res.json({ notification: updated });
});

module.exports = { listMine, markRead };
