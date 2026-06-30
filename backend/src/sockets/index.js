// ============================================================================
// Socket.IO realtime layer
// ----------------------------------------------------------------------------
// Rooms used:
//   user:<userId>        - personal channel for any logged-in user (notifications)
//   partner:<partnerId>  - job offers + status acks targeted at one partner
//   request:<requestId>  - live tracking + chat scoped to a single job, joined
//                           by both the customer and the assigned partner
//   admin                - live ops feed for the dashboard (all events)
//
// Events emitted (server -> client):
//   job:offer            { request }            -> to partner:<id>
//   job:offer:expired     { requestId }           -> to partner:<id>
//   request:status        { request }             -> to request:<id> and admin
//   request:assigned      { request }             -> to request:<id> and admin
//   partner:location       { partnerId, lat, lng } -> to request:<id> and admin
//   chat:message            { message }             -> to request:<id>
//   notification:new        { notification }        -> to user:<id>
//
// Events received (client -> server):
//   join:request   { requestId }
//   join:partner    { partnerId }
//   join:admin       {}
//   location:update  { partnerId, lat, lng, heading, speedKmph, requestId }
// ============================================================================

const jwt = require('jsonwebtoken');
const { getAllowedOrigins } = require('../utils/corsOrigins');
let ioInstance = null;

function initSockets(server) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: { origin: getAllowedOrigins(), methods: ['GET', 'POST'] },
  });

  ioInstance.use((socket, next) => {
    // Soft auth: token is optional for simplicity in this demo, but if
    // provided we attach the decoded user so room joins can be checked.
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        // ignore invalid token; socket just stays unauthenticated
      }
    }
    next();
  });

  ioInstance.on('connection', (socket) => {
    if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);

    socket.on('join:request', ({ requestId }) => {
      if (requestId) socket.join(`request:${requestId}`);
    });

    socket.on('join:partner', ({ partnerId }) => {
      if (partnerId) socket.join(`partner:${partnerId}`);
    });

    socket.on('join:admin', () => socket.join('admin'));

    socket.on('location:update', (payload) => {
      const { partnerId, requestId } = payload;
      if (!partnerId) return;
      ioInstance.to('admin').emit('partner:location', payload);
      if (requestId) ioInstance.to(`request:${requestId}`).emit('partner:location', payload);
    });

    socket.on('chat:typing', ({ requestId, senderId }) => {
      if (requestId) ioInstance.to(`request:${requestId}`).emit('chat:typing', { senderId });
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Sockets not initialised yet');
  return ioInstance;
}

module.exports = { initSockets, getIO };
