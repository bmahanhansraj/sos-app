const { z } = require('zod');
const customerRepo = require('../repositories/customer.repository');
const requestRepo = require('../repositories/request.repository');
const partnerRepo = require('../repositories/partner.repository');
const userRepo = require('../repositories/user.repository');
const agencyRepo = require('../repositories/agency.repository');
const paymentRepo = require('../repositories/payment.repository');
const notificationRepo = require('../repositories/notification.repository');
const broadcastRepo = require('../repositories/broadcast.repository');
const auditRepo = require('../repositories/audit.repository');
const ruleRepo = require('../repositories/notification-rule.repository');
const dispatchLogRepo = require('../repositories/notification-dispatch-log.repository');
const dispatchService = require('../services/dispatch.service');
const push = require('../integrations/push');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_PARTNER_FOUND'];

function getIOSafe() {
  try {
    return require('../sockets').getIO();
  } catch {
    return null;
  }
}

/** GET /api/admin/dashboard/summary -- "View analytics (requests, completion rate, revenue)" */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const allRequests = requestRepo.listAll({});
  const byStatus = {};
  for (const r of allRequests) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const terminalCount = allRequests.filter((r) => TERMINAL_STATUSES.includes(r.status)).length;
  const completedCount = byStatus.COMPLETED || 0;
  const completionRate = terminalCount > 0 ? Math.round((completedCount / terminalCount) * 1000) / 10 : 0;

  const successfulPayments = paymentRepo.listAll().filter((p) => p.status === 'SUCCESS');
  const totalRevenue = Math.round(successfulPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

  const partners = partnerRepo.listAll();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysRequests = allRequests.filter((r) => new Date(r.createdAt) >= startOfToday);

  res.json({
    totalRequests: allRequests.length,
    requestsByStatus: byStatus,
    completionRate,
    totalRevenue,
    todaysRequestCount: todaysRequests.length,
    partners: {
      total: partners.length,
      online: partners.filter((p) => p.isOnline).length,
      available: partners.filter((p) => p.isAvailable).length,
      pendingKyc: partners.filter((p) => p.kycStatus === 'PENDING_REVIEW').length,
      approved: partners.filter((p) => p.kycStatus === 'APPROVED').length,
    },
    activeRequestCount: requestRepo.listActive().length,
  });
});

/** GET /api/admin/dashboard/analytics?days=14 -- daily trend for the revenue/requests chart */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const days = Math.min(60, Math.max(1, Number(req.query.days) || 14));
  const allRequests = requestRepo.listAll({});
  const successfulPayments = paymentRepo.listAll().filter((p) => p.status === 'SUCCESS');

  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayRequests = allRequests.filter((r) => {
      const created = new Date(r.createdAt);
      return created >= dayStart && created < dayEnd;
    });
    const dayCompleted = dayRequests.filter((r) => r.status === 'COMPLETED').length;
    const dayRevenue = successfulPayments
      .filter((p) => {
        const paidAt = new Date(p.createdAt);
        return paidAt >= dayStart && paidAt < dayEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    series.push({
      date: dayStart.toISOString().slice(0, 10),
      requests: dayRequests.length,
      completed: dayCompleted,
      revenue: Math.round(dayRevenue * 100) / 100,
    });
  }

  res.json({ series });
});

/** GET /api/admin/live-map -- "Live map view of customers and partners" */
const getLiveMap = asyncHandler(async (req, res) => {
  const onlinePartners = partnerRepo.listAll().filter((p) => p.isOnline && p.currentLat != null);
  const partners = onlinePartners.map((p) => ({
    id: p.id,
    lat: p.currentLat,
    lng: p.currentLng,
    isAvailable: p.isAvailable,
    vehicleType: p.vehicleType,
    avgRating: p.avgRating,
    lastLocationAt: p.lastLocationAt,
    currentRequestId: requestRepo.listActive().find((r) => r.assignedPartnerId === p.id)?.id || null,
  }));
  const activeRequests = requestRepo.listActive().map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    status: r.status,
    isSos: r.isSos,
    serviceTypeId: r.serviceTypeId,
    customerId: r.customerId,
    pickupLat: r.pickupLat,
    pickupLng: r.pickupLng,
    assignedPartnerId: r.assignedPartnerId,
  }));
  res.json({ partners, activeRequests });
});

/** POST /api/admin/requests/:id/assign -- "Assign or reassign partners manually" */
const assignSchema = z.object({ partnerId: z.string() });

const assignPartner = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  const partner = partnerRepo.findById(req.body.partnerId);
  if (!partner) throw new HttpError(404, 'Partner not found');
  if (partner.kycStatus !== 'APPROVED') throw new HttpError(409, 'Partner KYC is not approved');

  const updated = dispatchService.manualAssign(request.id, partner.id, req.user.id);
  auditRepo.log({
    actorId: req.user.id,
    action: 'REQUEST_MANUALLY_ASSIGNED',
    entityType: 'ServiceRequest',
    entityId: request.id,
    details: { partnerId: partner.id },
  });
  res.json({ request: updated });
});

/** GET /api/admin/partners -- "Approve/reject partner registrations" queue + general partner list */
const listPartners = asyncHandler(async (req, res) => {
  const { kycStatus } = req.query;
  const partners = kycStatus ? partnerRepo.listByKycStatus(kycStatus) : partnerRepo.listAll();
  const withUser = partners.map((p) => ({ ...p, user: userRepo.findById(p.userId) }));
  res.json({ partners: withUser });
});

const rejectSchema = z.object({ reason: z.string().min(1).max(300) });

/** POST /api/admin/partners/:id/approve */
const approvePartner = asyncHandler(async (req, res) => {
  const partner = partnerRepo.findById(req.params.id);
  if (!partner) throw new HttpError(404, 'Partner not found');
  const updated = partnerRepo.approveKyc(partner.id, req.user.id);
  notificationRepo.create({
    userId: partner.userId,
    type: 'KYC',
    title: 'KYC approved',
    body: 'Your documents have been verified. You can now go online and start receiving jobs.',
  });
  auditRepo.log({ actorId: req.user.id, action: 'PARTNER_APPROVED', entityType: 'ServicePartner', entityId: partner.id });
  res.json({ partner: updated });
});

/** POST /api/admin/partners/:id/reject */
const rejectPartner = asyncHandler(async (req, res) => {
  const partner = partnerRepo.findById(req.params.id);
  if (!partner) throw new HttpError(404, 'Partner not found');
  const updated = partnerRepo.rejectKyc(partner.id, req.body.reason, req.user.id);
  notificationRepo.create({
    userId: partner.userId,
    type: 'KYC',
    title: 'KYC rejected',
    body: `Your documents were rejected: ${req.body.reason}. Please resubmit.`,
  });
  auditRepo.log({ actorId: req.user.id, action: 'PARTNER_REJECTED', entityType: 'ServicePartner', entityId: partner.id, details: { reason: req.body.reason } });
  res.json({ partner: updated });
});

/** GET /api/admin/audit-logs */
const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const logs = auditRepo.listRecent(limit).map((entry) => ({
    ...entry,
    actor: userRepo.findById(entry.actorId) || null,
  }));
  res.json({ logs });
});

/** GET /api/admin/customers -- name/phone lookup so the Requests table can show people, not UUIDs */
const listCustomers = asyncHandler(async (req, res) => {
  const customers = customerRepo.listAll().map((c) => ({ ...c, user: userRepo.findById(c.userId) }));
  res.json({ customers });
});

// ----------------------------------------------------------------------------
// USER MANAGEMENT -- "Manage/Edit Users"
// Generic across every role; role-specific actions (KYC approve/reject,
// pricing, etc.) stay on their own dedicated endpoints above/below.
// ----------------------------------------------------------------------------

/** GET /api/admin/users?role=&status=&search= */
const listUsers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  let users = userRepo.listAll();
  if (role) users = users.filter((u) => u.role === role);
  if (status) users = users.filter((u) => u.status === status);
  if (search) {
    const q = search.trim().toLowerCase();
    users = users.filter((u) => u.name?.toLowerCase().includes(q) || u.phone.includes(q));
  }
  res.json({ users: users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

const userPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
});

/** PATCH /api/admin/users/:id */
const updateUserAccount = asyncHandler(async (req, res) => {
  const target = userRepo.findById(req.params.id);
  if (!target) throw new HttpError(404, 'User not found');
  if (target.id === req.user.id && req.body.status && req.body.status !== 'ACTIVE') {
    throw new HttpError(400, "You can't suspend or block your own account.");
  }
  const updated = userRepo.updateUser(target.id, req.body);
  auditRepo.log({ actorId: req.user.id, action: 'USER_UPDATED', entityType: 'User', entityId: target.id, details: req.body });
  res.json({ user: updated });
});

// ----------------------------------------------------------------------------
// PARTNER EDIT -- "Manage/Edit Partners" (beyond the approve/reject queue above)
// ----------------------------------------------------------------------------

const partnerPatchSchema = z.object({
  vehicleType: z.string().optional(),
  vehicleRegNumber: z.string().nullable().optional(),
  cityId: z.string().nullable().optional(),
  agencyId: z.string().nullable().optional(),
});

/** PATCH /api/admin/partners/:id */
const updatePartnerProfile = asyncHandler(async (req, res) => {
  const partner = partnerRepo.findById(req.params.id);
  if (!partner) throw new HttpError(404, 'Partner not found');
  const updated = partnerRepo.update(partner.id, req.body);
  auditRepo.log({ actorId: req.user.id, action: 'PARTNER_UPDATED', entityType: 'ServicePartner', entityId: partner.id, details: req.body });
  res.json({ partner: updated });
});

// ----------------------------------------------------------------------------
// FLEET / AGENCY MANAGEMENT -- "Add Users in Customer- Fleet Partners"
// An agency owns a pool of partners (see ServicePartner.agencyId). Agencies
// can already self-register via /auth/otp; these endpoints let an admin
// onboard one directly instead, and manage them afterwards.
// ----------------------------------------------------------------------------

/** GET /api/admin/agencies */
const listAgencies = asyncHandler(async (req, res) => {
  const allPartners = partnerRepo.listAll();
  const agencies = agencyRepo.listAll().map((a) => ({
    ...a,
    user: userRepo.findById(a.userId),
    partnerCount: allPartners.filter((p) => p.agencyId === a.id).length,
  }));
  res.json({ agencies });
});

const createAgencySchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid phone number with country code, e.g. +919876543210'),
  registrationNumber: z.string().max(60).optional(),
  cityId: z.string().optional(),
});

/** POST /api/admin/agencies */
const createAgency = asyncHandler(async (req, res) => {
  if (userRepo.findByPhone(req.body.phone)) throw new HttpError(409, 'A user with this phone number already exists.');
  const user = userRepo.createUser({ phone: req.body.phone, role: 'RSA_AGENCY', name: req.body.name });
  userRepo.updateUser(user.id, { status: 'ACTIVE' });
  const agency = agencyRepo.createProfile(user.id, {
    name: req.body.name,
    registrationNumber: req.body.registrationNumber,
    cityId: req.body.cityId,
  });
  const activeAgency = agencyRepo.update(agency.id, { status: 'ACTIVE' });
  auditRepo.log({ actorId: req.user.id, action: 'AGENCY_CREATED', entityType: 'RsaAgency', entityId: agency.id });
  res.json({ agency: activeAgency, user });
});

const agencyPatchSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  cityId: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
});

/** PATCH /api/admin/agencies/:id */
const updateAgency = asyncHandler(async (req, res) => {
  const agency = agencyRepo.findById(req.params.id);
  if (!agency) throw new HttpError(404, 'Agency not found');
  const updated = agencyRepo.update(agency.id, req.body);
  auditRepo.log({ actorId: req.user.id, action: 'AGENCY_UPDATED', entityType: 'RsaAgency', entityId: agency.id, details: req.body });
  res.json({ agency: updated });
});

// ----------------------------------------------------------------------------
// ADMIN TEAM MANAGEMENT -- "Add User Group with Limited Access under Super
// Admin - Customer Support". SUPPORT accounts log in exactly like everyone
// else (phone + OTP); what differs is which routes requireRole lets them
// reach -- see routes/admin.routes.js for the per-route allow-list.
// ----------------------------------------------------------------------------

/** GET /api/admin/admins */
const listAdmins = asyncHandler(async (req, res) => {
  const admins = userRepo.listAll().filter((u) => u.role === 'ADMIN' || u.role === 'SUPPORT');
  res.json({ admins: admins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid phone number with country code, e.g. +919876543210'),
  role: z.enum(['ADMIN', 'SUPPORT']),
});

/** POST /api/admin/admins */
const createAdmin = asyncHandler(async (req, res) => {
  if (userRepo.findByPhone(req.body.phone)) throw new HttpError(409, 'A user with this phone number already exists.');
  const user = userRepo.createUser({ phone: req.body.phone, role: req.body.role, name: req.body.name });
  const updated = userRepo.updateUser(user.id, { status: 'ACTIVE' });
  auditRepo.log({ actorId: req.user.id, action: 'ADMIN_USER_CREATED', entityType: 'User', entityId: user.id, details: { role: req.body.role } });
  res.json({ user: updated });
});

const adminPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'SUPPORT']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
});

/** PATCH /api/admin/admins/:id */
const updateAdmin = asyncHandler(async (req, res) => {
  const target = userRepo.findById(req.params.id);
  if (!target || (target.role !== 'ADMIN' && target.role !== 'SUPPORT')) throw new HttpError(404, 'Admin team member not found');
  if (target.id === req.user.id) throw new HttpError(400, "You can't edit your own admin account from here.");
  const updated = userRepo.updateUser(target.id, req.body);
  auditRepo.log({ actorId: req.user.id, action: 'ADMIN_USER_UPDATED', entityType: 'User', entityId: target.id, details: req.body });
  res.json({ user: updated });
});

// ----------------------------------------------------------------------------
// BROADCAST NOTIFICATIONS -- "Push Notifications, Broadcast etc."
// Fans out to an in-app Notification (delivered live over each user's
// socket room) plus a best-effort Expo push to any registered device token.
// ----------------------------------------------------------------------------

const broadcastSchema = z
  .object({
    audience: z.enum(['ALL', 'CUSTOMERS', 'PARTNERS', 'USER']),
    userId: z.string().optional(),
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
  })
  .refine((data) => data.audience !== 'USER' || !!data.userId, {
    message: 'userId is required when audience is USER',
    path: ['userId'],
  });

/** POST /api/admin/notifications/broadcast */
const sendBroadcast = asyncHandler(async (req, res) => {
  const { audience, title, body, userId } = req.body;
  let targets;
  if (audience === 'USER') {
    const target = userRepo.findById(userId);
    if (!target) throw new HttpError(404, 'User not found');
    targets = [target];
  } else {
    targets = userRepo.listAll().filter((u) => u.status === 'ACTIVE');
    if (audience === 'CUSTOMERS') targets = targets.filter((u) => u.role === 'CUSTOMER');
    if (audience === 'PARTNERS') targets = targets.filter((u) => u.role === 'PARTNER');
  }

  for (const user of targets) {
    notificationRepo.create({ userId: user.id, type: 'SYSTEM', title, body });
  }

  const tokens = targets.map((u) => u.fcmToken).filter(Boolean);
  const pushResult = await push.sendBatch(tokens, { title, body, data: { kind: 'broadcast' } });

  const record = broadcastRepo.create({
    title,
    body,
    audience,
    sentById: req.user.id,
    recipientCount: targets.length,
    pushSentCount: pushResult.sent || 0,
    targetUserId: audience === 'USER' ? userId : null,
  });

  const io = getIOSafe();
  if (io) io.to('admin').emit('broadcast:sent', { broadcast: record });

  auditRepo.log({
    actorId: req.user.id,
    action: 'BROADCAST_SENT',
    entityType: 'Broadcast',
    entityId: record.id,
    details: { audience, recipientCount: targets.length },
  });

  res.json({ broadcast: record });
});

/** GET /api/admin/notifications/broadcasts */
const listBroadcasts = asyncHandler(async (req, res) => {
  const broadcasts = broadcastRepo.listRecent(50).map((b) => ({
    ...b,
    targetUser: b.targetUserId ? userRepo.findById(b.targetUserId) : null,
  }));
  res.json({ broadcasts });
});

/** GET /api/admin/notification-rules -- the full event x channel matrix */
const listNotificationRules = asyncHandler(async (req, res) => {
  res.json({ rules: ruleRepo.listAll(), events: ruleRepo.EVENTS, channels: ruleRepo.CHANNELS });
});

const notificationRulePatchSchema = z.object({
  enabled: z.boolean().optional(),
  subject: z.string().max(150).nullable().optional(),
  message: z.string().min(1).max(1000).optional(),
});

/** PATCH /api/admin/notification-rules/:id -- toggle a channel on/off or edit its template, e.g. id="ORDER_CONFIRMED:EMAIL" */
const updateNotificationRule = asyncHandler(async (req, res) => {
  const existing = ruleRepo.findById(req.params.id);
  if (!existing) throw new HttpError(404, 'Notification rule not found');
  const updated = ruleRepo.update(req.params.id, req.body, req.user.id);
  auditRepo.log({ actorId: req.user.id, action: 'NOTIFICATION_RULE_UPDATED', entityType: 'NotificationRule', entityId: req.params.id, details: req.body });
  res.json({ rule: updated });
});

/** GET /api/admin/notification-dispatch-log -- what actually fired, to whom, via which channel, and whether it succeeded */
const listNotificationDispatchLog = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit || 100);
  const logs = dispatchLogRepo.listRecent(limit).map((entry) => ({
    ...entry,
    user: entry.userId ? userRepo.findById(entry.userId) : null,
  }));
  res.json({ logs });
});

module.exports = {
  getDashboardSummary, getDashboardAnalytics, getLiveMap, assignPartner, listPartners, listCustomers,
  approvePartner, rejectPartner, listAuditLogs, assignSchema, rejectSchema,
  listUsers, updateUserAccount, userPatchSchema,
  updatePartnerProfile, partnerPatchSchema,
  listAgencies, createAgency, createAgencySchema, updateAgency, agencyPatchSchema,
  listAdmins, createAdmin, createAdminSchema, updateAdmin, adminPatchSchema,
  sendBroadcast, broadcastSchema, listBroadcasts,
  listNotificationRules, updateNotificationRule, notificationRulePatchSchema, listNotificationDispatchLog,
};
