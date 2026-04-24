const jwt = require('jsonwebtoken');

/**
 * Split a full name into firstName / lastName.
 * Single-word names produce a blank lastName rather than duplicating the first name.
 */
const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName:  parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
};

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

const formatAmount = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

const paiseToRupees = (paise) => paise / 100;

const rupeesToPaise = (rupees) => Math.round(rupees * 100);

const paginate = (page = 1, limit = 10) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  return { limit: parseInt(limit), offset };
};

module.exports = { generateTokens, splitName, formatAmount, paiseToRupees, rupeesToPaise, paginate };
