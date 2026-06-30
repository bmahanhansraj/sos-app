const db = require('../db/store');
const { newId, generateOtpCode } = require('../utils/helpers');

const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const OTP_EXPIRY_MIN = Number(process.env.OTP_EXPIRY_MINUTES || 5);

function createOtp({ userId = null, phone, purpose }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MIN * 60 * 1000);
  const record = {
    id: newId(),
    userId,
    phone,
    code: generateOtpCode(OTP_LENGTH),
    purpose,
    expiresAt: expiresAt.toISOString(),
    isUsed: false,
    attempts: 0,
    createdAt: now.toISOString(),
  };
  return db.insert('otps', record);
}

function findLatestActive(phone, purpose) {
  const candidates = db
    .find('otps', (o) => o.phone === phone && o.purpose === purpose && !o.isUsed)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return candidates[0] || null;
}

function verify({ phone, code, purpose }) {
  const otp = findLatestActive(phone, purpose);
  if (!otp) return { ok: false, reason: 'NO_ACTIVE_OTP' };
  if (new Date(otp.expiresAt) < new Date()) return { ok: false, reason: 'EXPIRED' };
  if (otp.attempts >= 5) return { ok: false, reason: 'TOO_MANY_ATTEMPTS' };

  if (otp.code !== code) {
    db.update('otps', otp.id, { attempts: otp.attempts + 1 });
    return { ok: false, reason: 'INVALID_CODE' };
  }
  db.update('otps', otp.id, { isUsed: true });
  return { ok: true, otp };
}

module.exports = { createOtp, findLatestActive, verify };
