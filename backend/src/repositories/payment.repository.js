const db = require('../db/store');
const { newId } = require('../utils/helpers');

function create({ requestId, customerId, amount, method, gatewayOrderId }) {
  const now = new Date().toISOString();
  return db.insert('payments', {
    id: newId(),
    requestId,
    customerId,
    amount,
    currency: 'INR',
    method,
    gateway: 'RAZORPAY',
    gatewayOrderId: gatewayOrderId || null,
    gatewayPaymentId: null,
    gatewaySignature: null,
    status: 'CREATED',
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

function findByRequestId(requestId) {
  return db.findOne('payments', (p) => p.requestId === requestId);
}

function findById(id) {
  return db.findById('payments', id);
}

function markSuccess(id, { gatewayPaymentId, gatewaySignature }) {
  return db.update('payments', id, {
    status: 'SUCCESS',
    gatewayPaymentId,
    gatewaySignature,
    paidAt: new Date().toISOString(),
  });
}

function markFailed(id) {
  return db.update('payments', id, { status: 'FAILED' });
}

function listForCustomer(customerId) {
  return db
    .find('payments', (p) => p.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listAll() {
  return db.all('payments');
}

module.exports = { create, findByRequestId, findById, markSuccess, markFailed, listForCustomer, listAll };
