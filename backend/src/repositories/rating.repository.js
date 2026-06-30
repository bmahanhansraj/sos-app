const db = require('../db/store');
const { newId } = require('../utils/helpers');

function create({ requestId, customerId, partnerId, rating, review }) {
  const record = db.insert('ratings', {
    id: newId(),
    requestId,
    customerId,
    partnerId,
    rating,
    review: review || null,
    partnerResponse: null,
    createdAt: new Date().toISOString(),
  });
  return record;
}

function findByRequestId(requestId) {
  return db.findOne('ratings', (r) => r.requestId === requestId);
}

function listForPartner(partnerId) {
  return db
    .find('ratings', (r) => r.partnerId === partnerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addPartnerResponse(id, response) {
  return db.update('ratings', id, { partnerResponse: response });
}

module.exports = { create, findByRequestId, listForPartner, addPartnerResponse };
