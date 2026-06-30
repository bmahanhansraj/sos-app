const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');
const { otpRequestLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/otp/request', otpRequestLimiter, validateBody(ctrl.requestOtpSchema), ctrl.requestOtp);
router.post('/otp/verify', validateBody(ctrl.verifyOtpSchema), ctrl.verifyOtp);

module.exports = router;
