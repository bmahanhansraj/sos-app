const { z } = require('zod');
const customerRepo = require('../repositories/customer.repository');
const requestRepo = require('../repositories/request.repository');
const paymentRepo = require('../repositories/payment.repository');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

function requireProfile(req) {
  const profile = customerRepo.findByUserId(req.user.id);
  if (!profile) throw new HttpError(404, 'Customer profile not found');
  return profile;
}

const addressSchema = z.object({
  addresses: z.array(
    z.object({
      label: z.string().min(1).max(50),
      lat: z.number(),
      lng: z.number(),
      address: z.string().min(1).max(300),
    })
  ),
});

/** GET /api/customers/me */
const getMyProfile = asyncHandler(async (req, res) => {
  res.json({ profile: requireProfile(req) });
});

/** PATCH /api/customers/me/addresses */
const updateAddresses = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const updated = customerRepo.updateSavedAddresses(profile.id, req.body.addresses);
  res.json({ profile: updated });
});

/** GET /api/customers/me/history */
const getHistory = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const requests = requestRepo.listForCustomer(profile.id);
  res.json({ requests });
});

/** GET /api/customers/me/payments */
const getPayments = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const payments = paymentRepo.listForCustomer(profile.id);
  res.json({ payments });
});

module.exports = { getMyProfile, updateAddresses, getHistory, getPayments, addressSchema };
