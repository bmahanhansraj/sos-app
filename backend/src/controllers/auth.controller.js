const { z } = require('zod');
const userRepo = require('../repositories/user.repository');
const otpRepo = require('../repositories/otp.repository');
const customerRepo = require('../repositories/customer.repository');
const partnerRepo = require('../repositories/partner.repository');
const agencyRepo = require('../repositories/agency.repository');
const sms = require('../integrations/sms');
const eventNotifier = require('../services/event-notifier.service');
const { signToken } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/; // loose E.164-ish check

const requestOtpSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, 'Enter a valid phone number with country code, e.g. +919876543210'),
  purpose: z.enum(['SIGNUP', 'LOGIN']),
  role: z.enum(['CUSTOMER', 'PARTNER', 'RSA_AGENCY']).optional(), // required when purpose=SIGNUP
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(PHONE_REGEX),
  code: z.string().min(4).max(8),
  purpose: z.enum(['SIGNUP', 'LOGIN']),
  role: z.enum(['CUSTOMER', 'PARTNER', 'RSA_AGENCY']).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  agencyName: z.string().min(1).max(150).optional(), // required for RSA_AGENCY signup
});

/** POST /api/auth/otp/request */
const requestOtp = asyncHandler(async (req, res) => {
  const { phone, purpose, role } = req.body;

  const existing = userRepo.findByPhone(phone);

  if (purpose === 'SIGNUP') {
    if (existing) throw new HttpError(409, 'This phone number is already registered. Please log in instead.');
    if (!role) throw new HttpError(400, 'role is required when purpose is SIGNUP');
  }
  if (purpose === 'LOGIN' && !existing) {
    throw new HttpError(404, 'No account found for this phone number. Please sign up first.');
  }

  const otp = otpRepo.createOtp({ userId: existing?.id || null, phone, purpose });
  await sms.sendOtpSms(phone, otp.code);

  const debugMode = String(process.env.OTP_DEBUG_MODE).toLowerCase() === 'true';
  res.json({
    sent: true,
    message: `A verification code has been sent to ${phone}.`,
    ...(debugMode ? { debugOtp: otp.code } : {}),
  });
});

function createRoleProfile(user, body) {
  if (user.role === 'CUSTOMER') {
    return { customerProfile: customerRepo.createProfile(user.id) };
  }
  if (user.role === 'PARTNER') {
    return { partnerProfile: partnerRepo.createProfile(user.id, {}) };
  }
  if (user.role === 'RSA_AGENCY') {
    return { agencyProfile: agencyRepo.createProfile(user.id, { name: body.agencyName || body.name || 'Unnamed Agency' }) };
  }
  return {};
}

function loadRoleProfile(user) {
  if (user.role === 'CUSTOMER') return { customerProfile: customerRepo.findByUserId(user.id) };
  if (user.role === 'PARTNER') return { partnerProfile: partnerRepo.findByUserId(user.id) };
  if (user.role === 'RSA_AGENCY') return { agencyProfile: agencyRepo.findByUserId(user.id) };
  return {};
}

/** POST /api/auth/otp/verify */
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, code, purpose, role, name, email } = req.body;

  const result = otpRepo.verify({ phone, code, purpose });
  if (!result.ok) {
    const messages = {
      NO_ACTIVE_OTP: 'No active verification code for this number. Please request a new one.',
      EXPIRED: 'This code has expired. Please request a new one.',
      TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Please request a new code.',
      INVALID_CODE: 'Incorrect verification code.',
    };
    throw new HttpError(400, messages[result.reason] || 'Verification failed.');
  }

  let user = userRepo.findByPhone(phone);
  let profile = {};

  if (purpose === 'SIGNUP') {
    if (user) throw new HttpError(409, 'This phone number is already registered. Please log in instead.');
    if (!role) throw new HttpError(400, 'role is required when purpose is SIGNUP');
    if (role === 'ADMIN') throw new HttpError(403, 'Admin accounts cannot self-register.');
    user = userRepo.createUser({ phone, role, name, email });
    user = userRepo.updateUser(user.id, { status: 'ACTIVE' });
    profile = createRoleProfile(user, req.body);
    eventNotifier.fireEvent('SIGNUP', { user }).catch((err) => console.error('[eventNotifier] SIGNUP failed:', err.message));
  } else {
    if (!user) throw new HttpError(404, 'No account found for this phone number.');
    if (user.status === 'PENDING') user = userRepo.updateUser(user.id, { status: 'ACTIVE' });
    profile = loadRoleProfile(user);
    eventNotifier.fireEvent('LOGIN', { user }).catch((err) => console.error('[eventNotifier] LOGIN failed:', err.message));
  }

  const token = signToken(user);
  res.json({ token, user, ...profile });
});

module.exports = { requestOtp, verifyOtp, requestOtpSchema, verifyOtpSchema };
