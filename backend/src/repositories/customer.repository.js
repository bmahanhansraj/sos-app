const db = require('../db/store');
const { newId } = require('../utils/helpers');

function createProfile(userId) {
  const now = new Date().toISOString();
  const profile = {
    id: newId(),
    userId,
    savedAddresses: JSON.stringify([]),
    defaultVehicle: null,
    totalRequests: 0,
    walletBalance: 0,
    createdAt: now,
  };
  return db.insert('customerProfiles', profile);
}

function findByUserId(userId) {
  return db.findOne('customerProfiles', (c) => c.userId === userId);
}

function findById(id) {
  return db.findById('customerProfiles', id);
}

function incrementRequestCount(profileId) {
  const profile = findById(profileId);
  if (!profile) return null;
  return db.update('customerProfiles', profileId, { totalRequests: (profile.totalRequests || 0) + 1 });
}

function updateSavedAddresses(profileId, addresses) {
  return db.update('customerProfiles', profileId, { savedAddresses: JSON.stringify(addresses) });
}

function listAll() {
  return db.all('customerProfiles');
}

module.exports = { createProfile, findByUserId, findById, incrementRequestCount, updateSavedAddresses, listAll };
