const db = require('../db/store');
const { newId } = require('../utils/helpers');

function createProfile(userId, { name, registrationNumber = null, cityId = null }) {
  const now = new Date().toISOString();
  return db.insert('rsaAgencies', {
    id: newId(),
    userId,
    name,
    registrationNumber,
    cityId,
    status: 'PENDING',
    createdAt: now,
  });
}

function findByUserId(userId) {
  return db.findOne('rsaAgencies', (a) => a.userId === userId);
}

function findById(id) {
  return db.findById('rsaAgencies', id);
}

function listAll() {
  return db.all('rsaAgencies');
}

function update(id, patch) {
  return db.update('rsaAgencies', id, patch);
}

module.exports = { createProfile, findByUserId, findById, listAll, update };
