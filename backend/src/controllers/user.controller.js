const { z } = require('zod');
const userRepo = require('../repositories/user.repository');
const customerRepo = require('../repositories/customer.repository');
const partnerRepo = require('../repositories/partner.repository');
const agencyRepo = require('../repositories/agency.repository');
const { asyncHandler } = require('../utils/asyncHandler');

const patchMeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  fcmToken: z.string().optional(), // push notification device token
  preferredLang: z.string().min(2).max(5).optional(),
});

function attachProfile(user) {
  if (user.role === 'CUSTOMER') return { ...user, profile: customerRepo.findByUserId(user.id) };
  if (user.role === 'PARTNER') return { ...user, profile: partnerRepo.findByUserId(user.id) };
  if (user.role === 'RSA_AGENCY') return { ...user, profile: agencyRepo.findByUserId(user.id) };
  return { ...user, profile: null };
}

/** GET /api/users/me */
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: attachProfile(req.user) });
});

/** PATCH /api/users/me */
const patchMe = asyncHandler(async (req, res) => {
  const updated = userRepo.updateUser(req.user.id, req.body);
  res.json({ user: attachProfile(updated) });
});

module.exports = { getMe, patchMe, patchMeSchema };
