// ============================================================================
// Embedded JSON datastore
// ----------------------------------------------------------------------------
// WHY THIS EXISTS:
// The production data model for this project is `prisma/schema.prisma`
// (mirrored in `database/schema.sql` as plain Postgres DDL). In a normal
// environment you would run `npx prisma generate && npx prisma db push`
// and talk to a real Postgres database through `@prisma/client`.
//
// This sandbox has restricted outbound network access and cannot download
// Prisma's query-engine binary, so this file provides a tiny, dependency-free
// JSON-file-backed store that implements the *same collections and shapes*
// as the Prisma schema. The rest of the app (controllers/services) never
// touches this file directly -- it only calls `src/db/repository.js`, so
// swapping this out for the real `@prisma/client` in production is a
// one-file change (see `src/db/repository.prisma.reference.js`).
// ============================================================================

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');

const COLLECTIONS = [
  'users', 'otps', 'customerProfiles', 'rsaAgencies', 'servicePartners',
  'partnerServices', 'serviceTypes', 'cities', 'pricingRules',
  'serviceRequests', 'statusHistory', 'payments', 'payouts', 'ratings',
  'locationPings', 'chatMessages', 'notifications', 'auditLogs', 'broadcasts',
  'notificationRules', 'notificationDispatchLog',
];

function emptyState() {
  const state = {};
  for (const c of COLLECTIONS) state[c] = [];
  return state;
}

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = emptyState();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw || '{}');
        this.state = { ...emptyState(), ...parsed };
      } else {
        this._persist();
      }
    } catch (err) {
      console.error('[store] Failed to load DB file, starting fresh:', err.message);
      this.state = emptyState();
    }
  }

  _persist() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  all(collection) {
    return this.state[collection] || [];
  }

  find(collection, predicate) {
    return this.all(collection).filter(predicate);
  }

  findOne(collection, predicate) {
    return this.all(collection).find(predicate) || null;
  }

  findById(collection, id) {
    return this.findOne(collection, (r) => r.id === id);
  }

  insert(collection, record) {
    this.state[collection] = this.state[collection] || [];
    this.state[collection].push(record);
    this._persist();
    return record;
  }

  update(collection, id, patch) {
    const list = this.state[collection] || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    this._persist();
    return list[idx];
  }

  remove(collection, id) {
    const list = this.state[collection] || [];
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this._persist();
    return true;
  }

  count(collection, predicate = () => true) {
    return this.all(collection).filter(predicate).length;
  }
}

module.exports = new JsonStore(DB_FILE);
