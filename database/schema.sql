-- ============================================================================
-- SoS - Services On Site  |  PostgreSQL schema
-- ----------------------------------------------------------------------------
-- This is a hand-written Postgres mirror of backend/prisma/schema.prisma.
-- It is the schema you would actually run in production:
--
--     createdb sos_db
--     psql sos_db -f database/schema.sql
--
-- The demo backend in this project runs against a small embedded JSON-file
-- store instead (see backend/src/db/store.js for why -- this sandbox blocks
-- the Prisma engine binary download), but every collection/field here lines
-- up 1:1 with what the repository layer reads and writes, so switching the
-- demo over to real Postgres + Prisma later is a drop-in change, not a
-- redesign. Run `npx prisma generate && npx prisma db push` against this
-- same schema.prisma file once you have unrestricted network access.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE role AS ENUM ('CUSTOMER', 'PARTNER', 'RSA_AGENCY', 'ADMIN', 'SUPPORT');
CREATE TYPE account_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');
CREATE TYPE kyc_status AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
CREATE TYPE otp_purpose AS ENUM ('SIGNUP', 'LOGIN', 'JOB_COMPLETION', 'PHONE_CHANGE');
CREATE TYPE vehicle_type AS ENUM (
  'TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER_HATCH', 'FOUR_WHEELER_SEDAN',
  'FOUR_WHEELER_SUV', 'COMMERCIAL', 'TOW_TRUCK_FLATBED', 'TOW_TRUCK_CRANE', 'NA'
);
CREATE TYPE request_status AS ENUM (
  'REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS',
  'COMPLETED', 'CANCELLED', 'NO_PARTNER_FOUND'
);
CREATE TYPE payment_method AS ENUM ('UPI', 'CARD', 'NETBANKING', 'WALLET');
CREATE TYPE payment_status AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE notification_type AS ENUM ('JOB_OFFER', 'STATUS_UPDATE', 'PAYMENT', 'KYC', 'SYSTEM', 'PROMO');

-- ----------------------------------------------------------------------------
-- CORE IDENTITY
-- ----------------------------------------------------------------------------

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone          VARCHAR(20) NOT NULL UNIQUE,
  email          VARCHAR(255) UNIQUE,
  name           VARCHAR(100),
  role           role NOT NULL,
  status         account_status NOT NULL DEFAULT 'PENDING',
  password_hash  TEXT,
  fcm_token      TEXT,
  preferred_lang VARCHAR(5) NOT NULL DEFAULT 'en',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE otp_verifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  phone      VARCHAR(20) NOT NULL,
  code       VARCHAR(8) NOT NULL,
  purpose    otp_purpose NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used    BOOLEAN NOT NULL DEFAULT false,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone_purpose ON otp_verifications(phone, purpose);

-- ----------------------------------------------------------------------------
-- CITIES  (multi-city expansion support)
-- ----------------------------------------------------------------------------

CREATE TABLE cities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(80) NOT NULL,
  state_name VARCHAR(80),
  code       VARCHAR(10) NOT NULL UNIQUE,
  center_lat DOUBLE PRECISION, -- service-area geofence: circle center + radius (km)
  center_lng DOUBLE PRECISION,
  radius_km  DOUBLE PRECISION,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- CUSTOMER
-- ----------------------------------------------------------------------------

CREATE TABLE customer_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  saved_addresses JSONB DEFAULT '[]',
  default_vehicle JSONB,
  total_requests  INTEGER NOT NULL DEFAULT 0,
  wallet_balance  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- RSA AGENCY  (optional role: owns/manages a pool of partners)
-- ----------------------------------------------------------------------------

CREATE TABLE rsa_agencies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(150) NOT NULL,
  registration_number VARCHAR(60),
  city_id             UUID REFERENCES cities(id),
  status              account_status NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- SERVICE PARTNER  (mechanic / tow / fuel / battery / tyre / key-maker etc.)
-- ----------------------------------------------------------------------------

CREATE TABLE service_partners (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  agency_id              UUID REFERENCES rsa_agencies(id),
  city_id                UUID REFERENCES cities(id),
  vehicle_type           vehicle_type NOT NULL DEFAULT 'NA',
  vehicle_reg_number     VARCHAR(20),

  kyc_status             kyc_status NOT NULL DEFAULT 'NOT_SUBMITTED',
  kyc_documents          JSONB DEFAULT '[]',
  cashfree_ref_id        VARCHAR(100),
  pan_number             VARCHAR(20),
  aadhaar_last4          VARCHAR(4),
  driving_license_number VARCHAR(40),
  approved_at            TIMESTAMPTZ,
  approved_by_id         UUID REFERENCES users(id),
  rejection_reason       TEXT,

  is_online              BOOLEAN NOT NULL DEFAULT false,
  is_available           BOOLEAN NOT NULL DEFAULT false,
  current_lat            DOUBLE PRECISION,
  current_lng            DOUBLE PRECISION,
  last_location_at       TIMESTAMPTZ,

  bank_account_number    VARCHAR(30),
  bank_ifsc              VARCHAR(15),
  upi_id                 VARCHAR(80),

  avg_rating             NUMERIC(2, 1) NOT NULL DEFAULT 0,
  total_ratings          INTEGER NOT NULL DEFAULT 0,
  total_jobs             INTEGER NOT NULL DEFAULT 0,
  total_earnings         NUMERIC(12, 2) NOT NULL DEFAULT 0,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_partners_online_available ON service_partners(is_online, is_available);
CREATE INDEX idx_partners_city ON service_partners(city_id);

-- ----------------------------------------------------------------------------
-- SERVICE CATALOG  (modular -- admin can add new service types without a
-- code deploy, satisfying the "add more services later" requirement)
-- ----------------------------------------------------------------------------

CREATE TABLE service_types (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(40) NOT NULL UNIQUE,
  name             VARCHAR(80) NOT NULL,
  description      TEXT,
  icon             VARCHAR(40),
  base_price       NUMERIC(10, 2) NOT NULL,
  price_per_km     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_mins   INTEGER NOT NULL DEFAULT 20,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_emergency_sos BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table: which service types a partner can fulfil, with optional
-- partner-specific override pricing.
CREATE TABLE partner_services (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id        UUID NOT NULL REFERENCES service_partners(id) ON DELETE CASCADE,
  service_type_id   UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  custom_base_price NUMERIC(10, 2),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (partner_id, service_type_id)
);

-- City-level / surge pricing overrides, enabling multi-city expansion.
CREATE TABLE pricing_rules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id          UUID REFERENCES cities(id),
  service_type_id  UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  base_price       NUMERIC(10, 2) NOT NULL,
  price_per_km     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  surge_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  night_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0, -- applied 10pm-6am
  min_fare         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  effective_from   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active        BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_pricing_rules_city_service ON pricing_rules(city_id, service_type_id);

-- ----------------------------------------------------------------------------
-- SERVICE REQUEST  (the core job lifecycle)
-- ----------------------------------------------------------------------------

CREATE TABLE service_requests (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number             VARCHAR(20) NOT NULL UNIQUE, -- e.g. SOS-2026-000123

  customer_id                UUID NOT NULL REFERENCES customer_profiles(id),
  service_type_id            UUID NOT NULL REFERENCES service_types(id),
  assigned_partner_id        UUID REFERENCES service_partners(id),

  status                     request_status NOT NULL DEFAULT 'REQUESTED',
  is_sos                     BOOLEAN NOT NULL DEFAULT false,

  pickup_lat                 DOUBLE PRECISION NOT NULL,
  pickup_lng                 DOUBLE PRECISION NOT NULL,
  pickup_address             TEXT,
  destination_lat            DOUBLE PRECISION, -- optional, used for towing drop-off
  destination_lng            DOUBLE PRECISION,
  destination_address        TEXT,

  vehicle_details            JSONB, -- {type, regNumber, model, color}
  customer_notes              TEXT,

  estimated_price            NUMERIC(10, 2) NOT NULL,
  final_price                NUMERIC(10, 2),
  estimated_eta_mins         INTEGER,
  distance_km                NUMERIC(8, 2),

  completion_otp             VARCHAR(8),
  completion_otp_verified_at TIMESTAMPTZ,

  cancel_reason              TEXT,
  cancelled_by               UUID REFERENCES users(id),

  requested_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at                TIMESTAMPTZ,
  en_route_at                TIMESTAMPTZ,
  arrived_at                 TIMESTAMPTZ,
  started_at                 TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  delay_flagged_at            TIMESTAMPTZ, -- set once by the delay-monitor sweep when a request blows past its ETA + grace buffer

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_status ON service_requests(status);
CREATE INDEX idx_requests_partner ON service_requests(assigned_partner_id);
CREATE INDEX idx_requests_customer ON service_requests(customer_id);

CREATE TABLE status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  status     request_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by VARCHAR(100), -- userId or "SYSTEM"
  notes      TEXT
);
CREATE INDEX idx_status_history_request ON status_history(request_id);

-- ----------------------------------------------------------------------------
-- PAYMENTS  (Razorpay -- prepaid only: UPI / Card / Netbanking / Wallet)
-- ----------------------------------------------------------------------------

CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id         UUID NOT NULL UNIQUE REFERENCES service_requests(id),
  customer_id        UUID NOT NULL REFERENCES customer_profiles(id),

  amount             NUMERIC(10, 2) NOT NULL,
  currency           VARCHAR(3) NOT NULL DEFAULT 'INR',
  method             payment_method NOT NULL,
  gateway            VARCHAR(20) NOT NULL DEFAULT 'RAZORPAY',

  gateway_order_id   VARCHAR(100),
  gateway_payment_id VARCHAR(100),
  gateway_signature  TEXT,

  status             payment_status NOT NULL DEFAULT 'CREATED',
  paid_at            TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_status ON payments(status);

-- Partner payouts (settlement of earnings out to bank/UPI)
CREATE TABLE payouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES service_partners(id),
  amount      NUMERIC(10, 2) NOT NULL,
  status      payment_status NOT NULL DEFAULT 'PENDING',
  reference   VARCHAR(100),
  period_from TIMESTAMPTZ NOT NULL,
  period_to   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- RATINGS & REVIEWS
-- ----------------------------------------------------------------------------

CREATE TABLE ratings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID NOT NULL UNIQUE REFERENCES service_requests(id),
  customer_id      UUID NOT NULL REFERENCES users(id),
  partner_id       UUID NOT NULL REFERENCES service_partners(id),
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review           TEXT,
  partner_response TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ratings_partner ON ratings(partner_id);

-- ----------------------------------------------------------------------------
-- LIVE LOCATION  (location pings for real-time tracking / history trail)
-- ----------------------------------------------------------------------------

CREATE TABLE location_pings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES service_partners(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  heading     DOUBLE PRECISION,
  speed_kmph  DOUBLE PRECISION,
  request_id  UUID REFERENCES service_requests(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_location_pings_partner_time ON location_pings(partner_id, recorded_at);

-- ----------------------------------------------------------------------------
-- CHAT  (in-app chat between customer & partner, scoped to a request)
-- ----------------------------------------------------------------------------

CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_request ON chat_messages(request_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- AUDIT LOG  (admin actions: approvals, manual reassignment, price changes)
-- ----------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(60) NOT NULL, -- e.g. "PARTNER_APPROVED", "REQUEST_REASSIGNED"
  entity_type VARCHAR(60) NOT NULL,
  entity_id   UUID NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- BROADCASTS  (admin-sent push + in-app announcements, fanned out to
-- individual notifications rows for each targeted recipient at send time)
-- ----------------------------------------------------------------------------

CREATE TABLE broadcasts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            VARCHAR(150) NOT NULL,
  body             TEXT NOT NULL,
  audience         VARCHAR(20) NOT NULL, -- ALL | CUSTOMERS | PARTNERS | USER
  target_user_id   UUID REFERENCES users(id), -- set when audience = USER
  sent_by_id       UUID NOT NULL REFERENCES users(id),
  recipient_count  INTEGER NOT NULL,
  push_sent_count  INTEGER NOT NULL DEFAULT 0,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- EVENT-DRIVEN NOTIFICATION RULES
-- One row per (event, channel) pair, e.g. id 'ORDER_CONFIRMED:EMAIL'. The
-- admin dashboard's Notification Rules page toggles `enabled` and edits
-- `subject`/`message`; the backend reads these at the moment a lifecycle
-- event actually fires.
-- ----------------------------------------------------------------------------

CREATE TABLE notification_rules (
  id          VARCHAR(60) PRIMARY KEY, -- composite key, e.g. 'ORDER_CONFIRMED:EMAIL'
  event       VARCHAR(30) NOT NULL,    -- SIGNUP | LOGIN | ORDER_CONFIRMED | ORDER_COMPLETED | ORDER_DELAYED | ORDER_CANCELLED
  channel     VARCHAR(20) NOT NULL,    -- EMAIL | SMS | WHATSAPP | ALERT
  enabled     BOOLEAN NOT NULL DEFAULT false,
  subject     VARCHAR(150),            -- email only
  message     TEXT NOT NULL,           -- template body, supports {{name}} {{requestNumber}} {{serviceName}} {{amount}} {{partnerName}} {{cancelReason}}
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES users(id)
);
CREATE INDEX idx_notification_rules_event ON notification_rules(event);

-- Every actual dispatch attempt (sent, skipped, or failed) -- distinct from
-- audit_logs, which records admin actions, not automated customer/partner
-- facing sends.
CREATE TABLE notification_dispatch_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       VARCHAR(30) NOT NULL,
  channel     VARCHAR(20) NOT NULL,
  user_id     UUID REFERENCES users(id),
  request_id  UUID REFERENCES service_requests(id),
  recipient   VARCHAR(255),  -- email, phone, or userId depending on channel
  subject     VARCHAR(150),
  message     TEXT NOT NULL,
  ok          BOOLEAN NOT NULL,
  reason      VARCHAR(255),  -- why it failed or was skipped
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dispatch_log_event ON notification_dispatch_log(event);
CREATE INDEX idx_dispatch_log_user ON notification_dispatch_log(user_id);

COMMIT;
