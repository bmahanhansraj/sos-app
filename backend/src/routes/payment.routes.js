const express = require('express');
const ctrl = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

// Razorpay calls this server-to-server; must stay unauthenticated.
router.post('/webhook', ctrl.webhook);

router.use(requireAuth, requireRole('CUSTOMER'));
router.post('/:id/confirm', validateBody(ctrl.confirmSchema), ctrl.confirmPayment);
router.post('/:id/simulate-failure', ctrl.simulateFailure);

module.exports = router;
