const express = require('express');
const ctrl = require('../controllers/request.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);

router.post('/quote', requireRole('CUSTOMER'), validateBody(ctrl.quoteSchema), ctrl.getQuote);
router.post('/', requireRole('CUSTOMER'), validateBody(ctrl.createRequestSchema), ctrl.createRequest);
router.get('/', requireRole('CUSTOMER', 'PARTNER', 'ADMIN'), ctrl.listRequests);
router.get('/:id', ctrl.getRequest);
router.get('/:id/partner-location', ctrl.getPartnerLocation);

router.post('/:id/respond', requireRole('PARTNER'), validateBody(ctrl.respondSchema), ctrl.respondToOffer);
router.patch('/:id/status', requireRole('PARTNER'), validateBody(ctrl.statusSchema), ctrl.updateStatus);
router.post('/:id/complete', requireRole('PARTNER'), validateBody(ctrl.completeSchema), ctrl.completeRequest);
router.post('/:id/cancel', requireRole('CUSTOMER', 'ADMIN'), validateBody(ctrl.cancelSchema), ctrl.cancelRequest);
router.post('/:id/rate', requireRole('CUSTOMER'), validateBody(ctrl.rateSchema), ctrl.rateRequest);

router.get('/:id/chat', ctrl.listChat);
router.post('/:id/chat', validateBody(ctrl.chatSchema), ctrl.postChat);

module.exports = router;
