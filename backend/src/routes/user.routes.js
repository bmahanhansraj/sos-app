const express = require('express');
const ctrl = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth);
router.get('/me', ctrl.getMe);
router.patch('/me', validateBody(ctrl.patchMeSchema), ctrl.patchMe);

module.exports = router;
