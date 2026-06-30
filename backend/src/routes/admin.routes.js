const express = require('express');
const adminCtrl = require('../controllers/admin.controller');
const catalogCtrl = require('../controllers/catalog.controller');
const requestCtrl = require('../controllers/request.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

// Both full Admins and limited-access Support staff can reach the dashboard
// at all; individual routes below tighten this further where an action is
// sensitive (money, staffing, account status, KYC decisions).
router.use(requireAuth, requireRole('ADMIN', 'SUPPORT'));

// Analytics + live ops -- read-only, safe for Support too
router.get('/dashboard/summary', adminCtrl.getDashboardSummary);
router.get('/dashboard/analytics', adminCtrl.getDashboardAnalytics);
router.get('/live-map', adminCtrl.getLiveMap);
router.get('/audit-logs', requireRole('ADMIN'), adminCtrl.listAuditLogs);

// Requests: "view all active and completed", manual assign/reassign --
// Support can triage and dispatch, just like an Admin would
router.get('/requests', requestCtrl.listRequests);
router.post('/requests/:id/assign', validateBody(adminCtrl.assignSchema), adminCtrl.assignPartner);

// Partner approval queue -- viewing is fine for Support, KYC decisions and
// profile edits are Admin-only
router.get('/partners', adminCtrl.listPartners);
router.get('/customers', adminCtrl.listCustomers);
router.post('/partners/:id/approve', requireRole('ADMIN'), adminCtrl.approvePartner);
router.post('/partners/:id/reject', requireRole('ADMIN'), validateBody(adminCtrl.rejectSchema), adminCtrl.rejectPartner);
router.patch('/partners/:id', requireRole('ADMIN'), validateBody(adminCtrl.partnerPatchSchema), adminCtrl.updatePartnerProfile);

// User management -- "Manage/Edit Users" (Admin-only: changes account status)
router.get('/users', adminCtrl.listUsers);
router.patch('/users/:id', requireRole('ADMIN'), validateBody(adminCtrl.userPatchSchema), adminCtrl.updateUserAccount);

// Fleet / Agency management -- "Add Users in Customer- Fleet Partners"
router.get('/agencies', adminCtrl.listAgencies);
router.post('/agencies', requireRole('ADMIN'), validateBody(adminCtrl.createAgencySchema), adminCtrl.createAgency);
router.patch('/agencies/:id', requireRole('ADMIN'), validateBody(adminCtrl.agencyPatchSchema), adminCtrl.updateAgency);

// Admin team management -- "Add User Group with Limited Access ... Customer
// Support" (strictly Admin-only: Support cannot create or edit staff accounts)
router.get('/admins', requireRole('ADMIN'), adminCtrl.listAdmins);
router.post('/admins', requireRole('ADMIN'), validateBody(adminCtrl.createAdminSchema), adminCtrl.createAdmin);
router.patch('/admins/:id', requireRole('ADMIN'), validateBody(adminCtrl.adminPatchSchema), adminCtrl.updateAdmin);

// Push notifications / broadcast -- Admin-only to avoid spam from a wider group
router.post('/notifications/broadcast', requireRole('ADMIN'), validateBody(adminCtrl.broadcastSchema), adminCtrl.sendBroadcast);
router.get('/notifications/broadcasts', adminCtrl.listBroadcasts);

// Event-driven notification rules (Sign Up / Login / Order Confirmed / Completed / Delayed / Cancelled
// -> Email / SMS / WhatsApp / Alert) -- editing is Admin-only, same as broadcasts; both roles can view.
router.get('/notification-rules', adminCtrl.listNotificationRules);
router.patch('/notification-rules/:id', requireRole('ADMIN'), validateBody(adminCtrl.notificationRulePatchSchema), adminCtrl.updateNotificationRule);
router.get('/notification-dispatch-log', adminCtrl.listNotificationDispatchLog);

// Pricing configuration / service catalog management -- Admin-only (money)
router.get('/catalog/services', catalogCtrl.adminListServiceTypes);
router.post('/catalog/services', requireRole('ADMIN'), validateBody(catalogCtrl.serviceTypeSchema), catalogCtrl.createServiceType);
router.patch('/catalog/services/:id', requireRole('ADMIN'), validateBody(catalogCtrl.serviceTypePatchSchema), catalogCtrl.updateServiceType);
router.post('/catalog/cities', requireRole('ADMIN'), validateBody(catalogCtrl.citySchema), catalogCtrl.createCity);
router.patch('/catalog/cities/:id', requireRole('ADMIN'), validateBody(catalogCtrl.cityPatchSchema), catalogCtrl.updateCity);
router.get('/catalog/place-search', catalogCtrl.searchPlaces);
router.get('/catalog/pricing-rules', catalogCtrl.listPricingRules);
router.post('/catalog/pricing-rules', requireRole('ADMIN'), validateBody(catalogCtrl.pricingRuleSchema), catalogCtrl.createPricingRule);
router.patch('/catalog/pricing-rules/:id', requireRole('ADMIN'), validateBody(catalogCtrl.pricingRulePatchSchema), catalogCtrl.updatePricingRule);

module.exports = router;
