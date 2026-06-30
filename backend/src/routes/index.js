const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/customers', require('./customer.routes'));
router.use('/partners', require('./partner.routes'));
router.use('/catalog', require('./catalog.routes'));
router.use('/requests', require('./request.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/agency', require('./agency.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/public', require('./public.routes'));

router.get('/health', (req, res) => res.json({ ok: true, service: 'sos-backend', time: new Date().toISOString() }));

module.exports = router;
