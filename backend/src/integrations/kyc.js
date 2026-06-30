// ============================================================================
// Cashfree Secure ID integration adapter (Partner KYC)
// ----------------------------------------------------------------------------
// Covers PAN / Aadhaar / Driving License verification during partner
// onboarding. If CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET are not set,
// `verifyDocument` runs in mock mode: it always returns PENDING_REVIEW so
// the submission flows through to an admin for manual approve/reject in
// the dashboard (exactly as the spec requires), without needing a live
// Cashfree sandbox account to demo the feature end-to-end.
//
// To go live: create a Cashfree account, set the two keys + CASHFREE_ENV
// (SANDBOX/PRODUCTION) in .env, and this adapter will call the real
// Secure ID verification endpoints.
// ============================================================================

const isMock = () => !process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET;

const BASE_URL = () =>
  process.env.CASHFREE_ENV === 'PRODUCTION'
    ? 'https://api.cashfree.com/verification'
    : 'https://sandbox.cashfree.com/verification';

async function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': process.env.CASHFREE_CLIENT_ID,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
  };
}

/**
 * documentType: 'PAN' | 'AADHAAR' | 'DRIVING_LICENSE'
 * Returns: { status: 'PENDING_REVIEW' | 'VERIFIED' | 'FAILED', refId, raw }
 */
async function verifyDocument({ documentType, documentNumber, name }) {
  if (isMock()) {
    return {
      status: 'PENDING_REVIEW',
      refId: `mock_${documentType.toLowerCase()}_${Date.now()}`,
      mock: true,
      note: 'Cashfree not configured -- routed to admin for manual KYC review.',
    };
  }

  const endpointByType = {
    PAN: '/pan',
    AADHAAR: '/offline-aadhaar/verify',
    DRIVING_LICENSE: '/driving-license',
  };
  const resp = await fetch(`${BASE_URL()}${endpointByType[documentType]}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ document_number: documentNumber, name }),
  });
  const data = await resp.json().catch(() => ({}));
  return {
    status: resp.ok ? 'VERIFIED' : 'FAILED',
    refId: data?.reference_id || null,
    raw: data,
  };
}

module.exports = { verifyDocument, isMock };
