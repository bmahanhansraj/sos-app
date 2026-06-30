/**
 * Parses CLIENT_ORIGIN into what the `cors` package and Socket.IO's own
 * `cors.origin` option both expect: either the literal string "*", or an
 * array of exact origins. Both Express's CORS middleware (index.js) and
 * Socket.IO's CORS config (sockets/index.js) call this instead of each
 * reading process.env.CLIENT_ORIGIN independently -- they used to do that,
 * and it let the two configs drift out of sync the moment CLIENT_ORIGIN
 * became a comma-separated list (Socket.IO would receive the raw
 * comma-joined string as a single literal origin, which never matches a
 * real browser's Origin header).
 */
function getAllowedOrigins() {
  const raw = (process.env.CLIENT_ORIGIN || '*').split(',').map((o) => o.trim());
  return raw.includes('*') ? '*' : raw;
}

module.exports = { getAllowedOrigins };
