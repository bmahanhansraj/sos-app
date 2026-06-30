const express = require('express');
const ctrl = require('../controllers/agency.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('RSA_AGENCY'));
router.get('/me', ctrl.getMyProfile);
router.get('/partners', ctrl.listMyPartners);
router.get('/requests', ctrl.listMyRequests);
router.get('/summary', ctrl.getSummary);

module.exports = router;
