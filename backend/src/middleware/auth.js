const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/user.repository');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = userRepo.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    if (user.status === 'SUSPENDED' || user.status === 'BLOCKED') {
      return res.status(403).json({ error: `Account is ${user.status.toLowerCase()}` });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `This action requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
