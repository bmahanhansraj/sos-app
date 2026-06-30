const express = require('express');
const ctrl = require('../controllers/customer.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth, requireRole('CUSTOMER'));
router.get('/me', ctrl.getMyProfile);
router.patch('/me/addresses', validateBody(ctrl.addressSchema), ctrl.updateAddresses);
router.get('/me/history', ctrl.getHistory);
router.get('/me/payments', ctrl.getPayments);

module.exports = router;
