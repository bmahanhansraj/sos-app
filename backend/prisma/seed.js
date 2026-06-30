// ============================================================================
// Demo seed script
// ----------------------------------------------------------------------------
// NOTE ON THE FILENAME: this lives under prisma/ to match the conventional
// `npm run seed` location, but it seeds data through the repository layer
// (src/repositories/*.js -> src/db/store.js), NOT through @prisma/client --
// see src/db/store.js for why (sandbox network restrictions block Prisma's
// query-engine binary download). In a real deployment with Postgres+Prisma
// available, this same script's *data* can be ported almost as-is into a
// `prisma.$transaction([...])` call using the generated client instead.
//
// Run with: npm run seed   (safe to re-run -- it skips if already seeded)
// ============================================================================

const userRepo = require('../src/repositories/user.repository');
const customerRepo = require('../src/repositories/customer.repository');
const partnerRepo = require('../src/repositories/partner.repository');
const agencyRepo = require('../src/repositories/agency.repository');
const catalogRepo = require('../src/repositories/catalog.repository');
const requestRepo = require('../src/repositories/request.repository');
const paymentRepo = require('../src/repositories/payment.repository');
const auditRepo = require('../src/repositories/audit.repository');
const broadcastRepo = require('../src/repositories/broadcast.repository');
const db = require('../src/db/store');

function seed() {
  if (userRepo.listAll().length > 0 && process.env.RESEED !== 'true') {
    console.log('Database already has data -- skipping seed (set RESEED=true to force).');
    return;
  }

  console.log('Seeding SoS demo data...\n');

  // --- Admin -----------------------------------------------------------
  const admin = userRepo.createUser({ phone: '+911234500000', role: 'ADMIN', name: 'Platform Admin', email: 'admin@sos-app.demo' });
  userRepo.updateUser(admin.id, { status: 'ACTIVE' });
  console.log(`  Admin user        +911234500000  (id ${admin.id})`);

  const support = userRepo.createUser({ phone: '+911234500001', role: 'SUPPORT', name: 'Customer Support', email: 'support@sos-app.demo' });
  userRepo.updateUser(support.id, { status: 'ACTIVE' });
  console.log(`  Support user      +911234500001  (id ${support.id})`);

  // --- Cities (multi-city expansion support) ----------------------------
  const delhi = catalogRepo.createCity({ name: 'Delhi', stateName: 'Delhi', code: 'DEL', centerLat: 28.6139, centerLng: 77.2090, radiusKm: 35 });
  const mumbai = catalogRepo.createCity({ name: 'Mumbai', stateName: 'Maharashtra', code: 'BOM', centerLat: 19.0760, centerLng: 72.8777, radiusKm: 40 });
  const bengaluru = catalogRepo.createCity({ name: 'Bengaluru', stateName: 'Karnataka', code: 'BLR', centerLat: 12.9716, centerLng: 77.5946, radiusKm: 30 });
  console.log(`  Cities            Delhi, Mumbai, Bengaluru`);

  // --- Service catalog (matches the roadside-assistance categories in spec) ---
  const serviceDefs = [
    { code: 'ROADSIDE_SOS', name: 'Emergency SOS', description: 'Tap the SOS button to get the nearest available help immediately.', icon: 'siren', basePrice: 99, pricePerKm: 5, estimatedMins: 15, isEmergencySos: true },
    { code: 'MECHANIC_ONSITE', name: 'On-site Mechanic', description: 'General vehicle breakdown & minor repairs at your location.', icon: 'wrench', basePrice: 199, pricePerKm: 8, estimatedMins: 25 },
    { code: 'BATTERY_JUMPSTART', name: 'Battery Jumpstart', description: 'Get your battery jumpstarted on the spot.', icon: 'battery-charging', basePrice: 179, pricePerKm: 6, estimatedMins: 20 },
    { code: 'ONSITE_BATTERY_CHARGING', name: 'On-site Battery Charging', description: 'Full battery charging service at your location.', icon: 'battery', basePrice: 249, pricePerKm: 6, estimatedMins: 30 },
    { code: 'FUEL_DELIVERY', name: 'Fuel Delivery', description: 'Petrol/diesel delivered to your stranded vehicle.', icon: 'fuel', basePrice: 149, pricePerKm: 10, estimatedMins: 20 },
    { code: 'FLAT_TIRE_TUBELESS', name: 'Flat Tire Repair - Tubeless', description: 'Tubeless tyre puncture repair / replacement.', icon: 'tire', basePrice: 199, pricePerKm: 6, estimatedMins: 25 },
    { code: 'FLAT_TIRE_TUBE', name: 'Flat Tire Repair - Tube', description: 'Tube-type tyre puncture repair / replacement.', icon: 'tire', basePrice: 179, pricePerKm: 6, estimatedMins: 25 },
    { code: 'TOWING_FLATBED', name: 'Towing - Flatbed', description: 'Flatbed tow truck for breakdowns and accidents.', icon: 'tow-flatbed', basePrice: 999, pricePerKm: 25, estimatedMins: 35 },
    { code: 'TOWING_CRANE', name: 'Towing - Crane', description: 'Crane-assisted towing for heavier vehicles / tricky recoveries.', icon: 'tow-crane', basePrice: 1499, pricePerKm: 30, estimatedMins: 40 },
    { code: 'KEY_MAKER', name: 'Locksmith / Key Maker', description: 'Locked out or lost your keys? On-site locksmith service.', icon: 'key', basePrice: 299, pricePerKm: 5, estimatedMins: 30 },
  ];
  const serviceTypes = {};
  for (const def of serviceDefs) serviceTypes[def.code] = catalogRepo.createServiceType(def);
  console.log(`  Service types     ${serviceDefs.length} created (${serviceDefs.map((s) => s.code).join(', ')})`);

  // City-specific surge example: Delhi towing-crane gets a 1.15x multiplier.
  catalogRepo.createPricingRule({
    cityId: delhi.id,
    serviceTypeId: serviceTypes.TOWING_CRANE.id,
    basePrice: 1499,
    pricePerKm: 30,
    surgeMultiplier: 1.15,
    nightMultiplier: 1.25,
    minFare: 1499,
  });
  console.log('  Pricing rule      Delhi towing-crane surge example (1.15x)');

  // --- RSA Agency --------------------------------------------------------
  const agencyUser = userRepo.createUser({ phone: '+911234511000', role: 'RSA_AGENCY', name: 'QuickFix RSA Agency' });
  userRepo.updateUser(agencyUser.id, { status: 'ACTIVE' });
  const agency = agencyRepo.createProfile(agencyUser.id, { name: 'QuickFix RSA Agency', registrationNumber: 'RSA-DEL-0042', cityId: delhi.id });
  agencyRepo.update(agency.id, { status: 'ACTIVE' });
  console.log(`  RSA Agency        QuickFix RSA Agency  +911234511000`);

  // --- Partners (varied KYC states + locations around central Delhi) ----
  // Central Delhi reference point ~ (28.6139, 77.2090) with small offsets so
  // they fall within the default 8km dispatch search radius for demo bookings.
  const BASE_LAT = 28.6139;
  const BASE_LNG = 77.209;

  const partnerDefs = [
    { phone: '+911234512001', name: 'Ramesh Kumar', vehicleType: 'TWO_WHEELER', services: ['MECHANIC_ONSITE', 'BATTERY_JUMPSTART', 'ROADSIDE_SOS'], kyc: 'APPROVED', online: true, latOff: 0.01, lngOff: 0.012, agency: true },
    { phone: '+911234512002', name: 'Suresh Singh', vehicleType: 'TOW_TRUCK_FLATBED', services: ['TOWING_FLATBED', 'TOWING_CRANE', 'ROADSIDE_SOS'], kyc: 'APPROVED', online: true, latOff: -0.015, lngOff: 0.02, agency: true },
    { phone: '+911234512003', name: 'Anil Yadav', vehicleType: 'FOUR_WHEELER_HATCH', services: ['FUEL_DELIVERY', 'ONSITE_BATTERY_CHARGING', 'ROADSIDE_SOS'], kyc: 'APPROVED', online: true, latOff: 0.022, lngOff: -0.01 },
    { phone: '+911234512004', name: 'Vikram Joshi', vehicleType: 'THREE_WHEELER', services: ['FLAT_TIRE_TUBELESS', 'FLAT_TIRE_TUBE', 'ROADSIDE_SOS'], kyc: 'APPROVED', online: true, latOff: -0.008, lngOff: -0.018 },
    { phone: '+911234512005', name: 'Deepak Mehta', vehicleType: 'TWO_WHEELER', services: ['KEY_MAKER', 'ROADSIDE_SOS'], kyc: 'APPROVED', online: true, latOff: 0.005, lngOff: 0.03 },
    { phone: '+911234512006', name: 'Sandeep Rana', vehicleType: 'FOUR_WHEELER_SEDAN', services: ['MECHANIC_ONSITE', 'FLAT_TIRE_TUBELESS'], kyc: 'PENDING_REVIEW', online: false },
    { phone: '+911234512007', name: 'Imran Sheikh', vehicleType: 'TOW_TRUCK_CRANE', services: ['TOWING_CRANE'], kyc: 'REJECTED', online: false, rejectionReason: 'Driving license document unreadable, please resubmit.' },
  ];

  const partnerProfiles = {};
  for (const def of partnerDefs) {
    const user = userRepo.createUser({ phone: def.phone, role: 'PARTNER', name: def.name });
    userRepo.updateUser(user.id, { status: 'ACTIVE' });
    const profile = partnerRepo.createProfile(user.id, {
      vehicleType: def.vehicleType,
      vehicleRegNumber: `DL0${Math.floor(1000 + Math.random() * 8999)}`,
      agencyId: def.agency ? agency.id : null,
      cityId: delhi.id,
    });
    partnerProfiles[def.name] = profile;

    for (const code of def.services) partnerRepo.addService(profile.id, serviceTypes[code].id);

    if (def.kyc === 'APPROVED') {
      partnerRepo.submitKyc(profile.id, { documents: [{ type: 'DRIVING_LICENSE', url: 'mock://dl.jpg' }], panNumber: 'ABCDE1234F', aadhaarLast4: '1234', drivingLicenseNumber: 'DL-99-2020-0012345', cashfreeRefId: `mock_seed_${profile.id.slice(0, 6)}` });
      partnerRepo.approveKyc(profile.id, admin.id);
    } else if (def.kyc === 'PENDING_REVIEW') {
      partnerRepo.submitKyc(profile.id, { documents: [{ type: 'PAN', url: 'mock://pan.jpg' }], panNumber: 'PQRST5678G', aadhaarLast4: '5678', drivingLicenseNumber: 'DL-99-2021-0054321', cashfreeRefId: `mock_seed_${profile.id.slice(0, 6)}` });
    } else if (def.kyc === 'REJECTED') {
      partnerRepo.submitKyc(profile.id, { documents: [{ type: 'DRIVING_LICENSE', url: 'mock://dl_bad.jpg' }], panNumber: 'LMNOP9999H', aadhaarLast4: '9999', drivingLicenseNumber: 'DL-99-2019-0099999', cashfreeRefId: `mock_seed_${profile.id.slice(0, 6)}` });
      partnerRepo.rejectKyc(profile.id, def.rejectionReason, admin.id);
    }

    if (def.online) {
      partnerRepo.setAvailability(profile.id, { isOnline: true, isAvailable: true });
      partnerRepo.updateLocation(profile.id, { lat: BASE_LAT + (def.latOff || 0), lng: BASE_LNG + (def.lngOff || 0) });
      // seed a little earnings/rating history so the partner & admin dashboards aren't empty
      partnerRepo.recordCompletedJob(profile.id, 250 + Math.floor(Math.random() * 600));
      partnerRepo.update(profile.id, { avgRating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10, totalRatings: 4 + Math.floor(Math.random() * 20) });
    }
  }
  console.log(`  Partners          ${partnerDefs.length} created (5 approved+online, 1 pending KYC, 1 rejected)`);

  // --- Customers -----------------------------------------------------------
  const customerDefs = [
    { phone: '+911234513001', name: 'Priya Sharma', email: 'priya.sharma@example.com' },
    { phone: '+911234513002', name: 'Arjun Verma', email: 'arjun.verma@example.com' },
  ];
  const customerProfiles = {};
  for (const def of customerDefs) {
    const user = userRepo.createUser({ phone: def.phone, role: 'CUSTOMER', name: def.name, email: def.email });
    userRepo.updateUser(user.id, { status: 'ACTIVE' });
    customerProfiles[def.name] = customerRepo.createProfile(user.id);
  }
  console.log(`  Customers         ${customerDefs.length} created`);

  // --- Service requests (active + completed + cancelled, every status) ----
  // Placed near each assigned partner's seeded location so the Live Map
  // reads naturally, and backdated where appropriate so the Overview trend
  // chart has more than a single day of data to show.
  function daysAgo(n, hour = 12) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  // Every request is prepaid in this product, so every seeded request gets
  // a matching confirmed payment -- otherwise the revenue figures on
  // Overview and the analytics trend would sit at zero despite "active" and
  // "completed" requests existing, which would look like a second bug.
  function seedPayment(request, customerId, amount, paidAt) {
    const payment = paymentRepo.create({ requestId: request.id, customerId, amount, method: 'UPI', gatewayOrderId: `mock_order_${request.id.slice(0, 8)}` });
    paymentRepo.markSuccess(payment.id, { gatewayPaymentId: `mock_pay_${payment.id.slice(0, 8)}`, gatewaySignature: 'mock_signature' });
    if (paidAt) db.update('payments', payment.id, { paidAt, createdAt: paidAt });
    return payment;
  }

  const priya = customerProfiles['Priya Sharma'];
  const arjun = customerProfiles['Arjun Verma'];

  // 1. REQUESTED, unassigned -- an SOS that's deliberately waiting for a
  //    manual assign so the admin has something to act on immediately.
  const reqSos = requestRepo.create({
    customerId: priya.id,
    serviceTypeId: serviceTypes.ROADSIDE_SOS.id,
    isSos: true,
    pickupLat: BASE_LAT,
    pickupLng: BASE_LNG,
    pickupAddress: 'Connaught Place, New Delhi',
    estimatedPrice: 99,
    customerNotes: 'Car stalled in the middle lane, hazards on.',
  });
  seedPayment(reqSos, priya.id, 99);

  // 2. ASSIGNED -- partner accepted, hasn't started moving yet.
  const reqAssigned = requestRepo.create({
    customerId: arjun.id,
    serviceTypeId: serviceTypes.MECHANIC_ONSITE.id,
    pickupLat: BASE_LAT + 0.009,
    pickupLng: BASE_LNG + 0.011,
    pickupAddress: 'Lajpat Nagar, New Delhi',
    estimatedPrice: 199,
  });
  requestRepo.assignPartner(reqAssigned.id, partnerProfiles['Ramesh Kumar'].id);
  seedPayment(reqAssigned, arjun.id, 199);

  // 3. EN_ROUTE
  const reqEnRoute = requestRepo.create({
    customerId: priya.id,
    serviceTypeId: serviceTypes.ONSITE_BATTERY_CHARGING.id,
    pickupLat: BASE_LAT + 0.02,
    pickupLng: BASE_LNG - 0.008,
    pickupAddress: 'Greater Kailash, New Delhi',
    estimatedPrice: 249,
  });
  requestRepo.assignPartner(reqEnRoute.id, partnerProfiles['Anil Yadav'].id);
  requestRepo.transitionStatus(reqEnRoute.id, 'EN_ROUTE', partnerProfiles['Anil Yadav'].id);
  seedPayment(reqEnRoute, priya.id, 249);

  // 4. ARRIVED
  const reqArrived = requestRepo.create({
    customerId: arjun.id,
    serviceTypeId: serviceTypes.FLAT_TIRE_TUBELESS.id,
    pickupLat: BASE_LAT - 0.006,
    pickupLng: BASE_LNG - 0.015,
    pickupAddress: 'Hauz Khas, New Delhi',
    estimatedPrice: 199,
  });
  requestRepo.assignPartner(reqArrived.id, partnerProfiles['Vikram Joshi'].id);
  requestRepo.transitionStatus(reqArrived.id, 'EN_ROUTE', partnerProfiles['Vikram Joshi'].id);
  requestRepo.transitionStatus(reqArrived.id, 'ARRIVED', partnerProfiles['Vikram Joshi'].id);
  seedPayment(reqArrived, arjun.id, 199);

  // 5. IN_PROGRESS
  const reqInProgress = requestRepo.create({
    customerId: priya.id,
    serviceTypeId: serviceTypes.TOWING_FLATBED.id,
    pickupLat: BASE_LAT - 0.013,
    pickupLng: BASE_LNG + 0.017,
    pickupAddress: 'Vasant Kunj, New Delhi',
    estimatedPrice: 999,
  });
  requestRepo.assignPartner(reqInProgress.id, partnerProfiles['Suresh Singh'].id);
  requestRepo.transitionStatus(reqInProgress.id, 'EN_ROUTE', partnerProfiles['Suresh Singh'].id);
  requestRepo.transitionStatus(reqInProgress.id, 'ARRIVED', partnerProfiles['Suresh Singh'].id);
  requestRepo.transitionStatus(reqInProgress.id, 'IN_PROGRESS', partnerProfiles['Suresh Singh'].id);
  seedPayment(reqInProgress, priya.id, 999);

  // 6-8. COMPLETED, backdated across the last few days for the trend chart.
  const completedDefs = [
    { customer: arjun, service: 'BATTERY_JUMPSTART', partner: 'Ramesh Kumar', price: 179, daysBack: 1 },
    { customer: priya, service: 'KEY_MAKER', partner: 'Deepak Mehta', price: 299, daysBack: 2 },
    { customer: arjun, service: 'FLAT_TIRE_TUBE', partner: 'Vikram Joshi', price: 179, daysBack: 4 },
  ];
  for (const def of completedDefs) {
    const r = requestRepo.create({
      customerId: def.customer.id,
      serviceTypeId: serviceTypes[def.service].id,
      pickupLat: BASE_LAT + (Math.random() - 0.5) * 0.03,
      pickupLng: BASE_LNG + (Math.random() - 0.5) * 0.03,
      pickupAddress: 'New Delhi',
      estimatedPrice: def.price,
    });
    const partnerId = partnerProfiles[def.partner].id;
    requestRepo.assignPartner(r.id, partnerId);
    requestRepo.transitionStatus(r.id, 'EN_ROUTE', partnerId);
    requestRepo.transitionStatus(r.id, 'ARRIVED', partnerId);
    requestRepo.transitionStatus(r.id, 'IN_PROGRESS', partnerId);
    requestRepo.update(r.id, { finalPrice: def.price });
    requestRepo.transitionStatus(r.id, 'COMPLETED', partnerId, 'OTP verified by partner');
    requestRepo.update(r.id, { createdAt: daysAgo(def.daysBack, 9), requestedAt: daysAgo(def.daysBack, 9), completedAt: daysAgo(def.daysBack, 10) });
    seedPayment(r, def.customer.id, def.price, daysAgo(def.daysBack, 9));
  }

  // 9. CANCELLED
  const reqCancelled = requestRepo.create({
    customerId: priya.id,
    serviceTypeId: serviceTypes.FUEL_DELIVERY.id,
    pickupLat: BASE_LAT + 0.015,
    pickupLng: BASE_LNG - 0.02,
    pickupAddress: 'Saket, New Delhi',
    estimatedPrice: 149,
  });
  requestRepo.cancel(reqCancelled.id, 'Found a friend nearby with spare fuel', priya.userId);
  requestRepo.update(reqCancelled.id, { createdAt: daysAgo(1, 16) });
  seedPayment(reqCancelled, priya.id, 149, daysAgo(1, 16));

  // 10. NO_PARTNER_FOUND -- the other case that specifically needs a manual
  //     admin assign, alongside the unassigned SOS request above.
  const reqNoPartner = requestRepo.create({
    customerId: arjun.id,
    serviceTypeId: serviceTypes.TOWING_CRANE.id,
    pickupLat: BASE_LAT + 0.03,
    pickupLng: BASE_LNG + 0.03,
    pickupAddress: 'Rohini, New Delhi',
    estimatedPrice: 1499,
  });
  requestRepo.transitionStatus(reqNoPartner.id, 'NO_PARTNER_FOUND', 'SYSTEM', 'Dispatch queue exhausted, no partner accepted in time');
  seedPayment(reqNoPartner, arjun.id, 1499);

  console.log('  Service requests  10 created (1 unassigned SOS, 4 active, 3 completed, 1 cancelled, 1 no-partner-found)');

  // --- Audit log history --------------------------------------------------
  // The seed script builds data directly through the repositories, bypassing
  // the controller layer that normally writes audit entries -- so without
  // this, the new Audit Logs page would be empty on first run despite the
  // feature working perfectly. A few backdated, illustrative entries give
  // it something real to show.
  function seedAuditEntry({ actorId, action, entityType, entityId, details, daysBack, hour = 11 }) {
    const entry = auditRepo.log({ actorId, action, entityType, entityId, details });
    db.update('auditLogs', entry.id, { createdAt: daysAgo(daysBack, hour) });
  }

  seedAuditEntry({
    actorId: admin.id, action: 'PARTNER_APPROVED', entityType: 'ServicePartner',
    entityId: partnerProfiles['Ramesh Kumar'].id, details: { vehicleType: 'TWO_WHEELER' }, daysBack: 6, hour: 10,
  });
  seedAuditEntry({
    actorId: admin.id, action: 'CITY_CREATED', entityType: 'City',
    entityId: delhi.id, details: { name: 'Delhi', radiusKm: delhi.radiusKm }, daysBack: 5, hour: 9,
  });
  seedAuditEntry({
    actorId: admin.id, action: 'PRICING_RULE_CREATED', entityType: 'PricingRule',
    entityId: serviceTypes.TOWING_FLATBED.id, details: { cityId: delhi.id, surgeMultiplier: 1.2 }, daysBack: 4, hour: 18,
  });
  const seededBroadcast = broadcastRepo.create({
    title: 'Monsoon advisory', body: 'Heavy rain expected this week -- drive carefully and budget extra time.',
    audience: 'CUSTOMERS', sentById: admin.id, recipientCount: 2, pushSentCount: 0,
  });
  db.update('broadcasts', seededBroadcast.id, { sentAt: daysAgo(3, 8) });
  seedAuditEntry({
    actorId: admin.id, action: 'BROADCAST_SENT', entityType: 'Broadcast',
    entityId: seededBroadcast.id, details: { audience: 'CUSTOMERS', title: 'Monsoon advisory' }, daysBack: 3, hour: 8,
  });
  seedAuditEntry({
    actorId: admin.id, action: 'USER_UPDATED', entityType: 'User',
    entityId: arjun.userId, details: { status: 'ACTIVE' }, daysBack: 2, hour: 15,
  });
  seedAuditEntry({
    actorId: admin.id, action: 'PARTNER_REJECTED', entityType: 'ServicePartner',
    entityId: partnerProfiles['Imran Sheikh'].id, details: { reason: 'Driving license document unreadable, please resubmit.' }, daysBack: 1, hour: 13,
  });
  console.log('  Audit log         6 illustrative entries created');


  console.log('\nSeed complete. Demo login numbers (OTP_DEBUG_MODE=true returns the code in the API response):');
  console.log('  Admin:     +911234500000');
  console.log('  Support:   +911234500001');
  console.log('  Agency:    +911234511000');
  console.log('  Partners:  +911234512001 .. +911234512007');
  console.log('  Customers: +911234513001, +911234513002\n');
}

seed();
