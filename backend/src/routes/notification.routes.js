const express = require('express');
const ctrl = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', ctrl.listMine);
router.post('/:id/read', ctrl.markRead);

module.exports = router;
