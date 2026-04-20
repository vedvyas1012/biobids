const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

const formatAmount = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

const paiseToRupees = (paise) => paise / 100;

const rupeesToPaise = (rupees) => Math.round(rupees * 100);

const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

const paginate = (page = 1, limit = 10) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  return { limit: parseInt(limit), offset };
};

module.exports = { generateTokens, formatAmount, paiseToRupees, rupeesToPaise, verifyRazorpaySignature, paginate };
