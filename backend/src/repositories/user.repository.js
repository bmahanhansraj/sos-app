const db = require('../db/store');
const { newId } = require('../utils/helpers');

function createUser({ phone, role, name = null, email = null }) {
  const now = new Date().toISOString();
  const user = {
    id: newId(),
    phone,
    email,
    name,
    role, // CUSTOMER | PARTNER | RSA_AGENCY | ADMIN
    status: 'PENDING',
    fcmToken: null,
    preferredLang: 'en',
    createdAt: now,
    updatedAt: now,
  };
  return db.insert('users', user);
}

function findByPhone(phone) {
  return db.findOne('users', (u) => u.phone === phone);
}

function findById(id) {
  return db.findById('users', id);
}

function updateUser(id, patch) {
  return db.update('users', id, patch);
}

function listByRole(role) {
  return db.find('users', (u) => u.role === role);
}

function listAll() {
  return db.all('users');
}

module.exports = { createUser, findByPhone, findById, updateUser, listByRole, listAll };
