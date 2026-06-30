require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initSockets } = require('./sockets');
const delayMonitor = require('./services/delay-monitor.service');

const app = express();

app.use(helmet());
// CLIENT_ORIGIN can be a single origin or a comma-separated list -- there are
// two real frontend properties now (the public website at sos.ind.in and the
// admin/agency portal at a separate subdomain), so production needs to allow
// both. Defaults to "allow everything" for local development across however
// many frontend dev servers happen to be running.
//
// No `credentials: true` here: every client authenticates with a JWT sent
// as an `Authorization: Bearer <token>` header (see middleware/auth.js),
// never a cookie, so there's nothing that needs cross-origin credentials.
// Setting credentials:true alongside a wildcard origin would also be
// self-contradictory -- the CORS spec forbids combining
// Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials:
// true, and browsers enforce that by silently dropping the credentials.
const { getAllowedOrigins } = require('./utils/corsOrigins');
app.use(cors({ origin: getAllowedOrigins() }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ service: 'SoS - Services On Site API', status: 'running', docs: '/api/health' });
});

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);
const server = http.createServer(app);
initSockets(server);

server.listen(PORT, () => {
  console.log(`\n🚦  SoS backend listening on http://localhost:${PORT}`);
  console.log(`    Socket.IO realtime layer attached to the same server.`);
  console.log(`    Mock-mode status:`);
  console.log(`      SMS/OTP/Push (MSG91)  -> ${require('./integrations/sms').isMock() ? 'MOCK' : 'LIVE'}`);
  console.log(`      Email                 -> ${require('./integrations/email').activeMode()}`);
  console.log(`      Payments (Razorpay)   -> ${require('./integrations/payment').isMock() ? 'MOCK' : 'LIVE'}`);
  console.log(`      KYC (Cashfree)        -> ${require('./integrations/kyc').isMock() ? 'MOCK' : 'LIVE'}`);
  console.log(`      Maps (Google)         -> ${require('./integrations/maps').isMock() ? 'MOCK (Haversine fallback)' : 'LIVE'}\n`);
  delayMonitor.start();
  console.log(`    Delay monitor sweeping every ${delayMonitor.SWEEP_INTERVAL_MS / 60000} min (grace buffer: ${delayMonitor.GRACE_BUFFER_MINUTES} min past ETA).\n`);
});

module.exports = { app, server };
