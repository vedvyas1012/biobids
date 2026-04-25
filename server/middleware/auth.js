const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'refresh_token'] },
    });
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account has been suspended. Contact support.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Like authenticate but non-blocking — attaches req.user if token present, otherwise continues
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'refresh_token'] },
    });
  } catch (err) {
    // Silence expected JWT errors (missing/expired token is normal for unauthenticated visitors).
    // Log unexpected DB-level failures for observability.
    if (!(err instanceof jwt.JsonWebTokenError) && !(err instanceof jwt.TokenExpiredError)) {
      console.error('[optionalAuth] unexpected error:', err.message);
    }
  }
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
