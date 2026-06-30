const express = require('express');
const ctrl = require('../controllers/partner.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.use(requireAuth, requireRole('PARTNER'));
router.get('/me', ctrl.getMyProfile);
router.post('/kyc', validateBody(ctrl.kycSchema), ctrl.submitKyc);
router.patch('/me/availability', validateBody(ctrl.availabilitySchema), ctrl.setAvailability);
router.patch('/me/location', validateBody(ctrl.locationSchema), ctrl.updateLocation);
router.get('/me/services', ctrl.listServices);
router.post('/me/services', validateBody(ctrl.addServiceSchema), ctrl.addService);
router.delete('/me/services/:serviceTypeId', ctrl.removeService);
router.get('/me/jobs', ctrl.listJobs);
router.get('/me/earnings', ctrl.getEarnings);
router.get('/me/ratings', ctrl.listRatings);
router.post('/me/join-agency', validateBody(ctrl.joinAgencySchema), ctrl.joinAgency);

module.exports = router;
