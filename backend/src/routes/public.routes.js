const express = require('express');
const publicCtrl = require('../controllers/public.controller');
const { publicApiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(publicApiLimiter);
router.get('/stats', publicCtrl.getPublicStats);

module.exports = router;
