const Razorpay = require('razorpay');
const crypto = require('crypto');

/** ₹1,000 deposit — stored in paise */
const DEPOSIT_PAISE = 100_000;

/** Lazily initialise so missing keys don't crash server boot */
const getRazorpay = () =>
  new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

/**
 * Create a Razorpay order for the ₹1,000 bid security deposit.
 * @param {number} bidId
 * @param {string} buyerEmail
 */
async function createDepositOrder(bidId, buyerEmail) {
  const rz = getRazorpay();
  return rz.orders.create({
    amount:   DEPOSIT_PAISE,
    currency: 'INR',
    receipt:  `dep_${bidId}`,
    notes:    { purpose: 'bid_deposit', bid_id: String(bidId), buyer: buyerEmail },
  });
}

/**
 * Verify Razorpay payment signature.
 * Must be called server-side — never trust the client's claim alone.
 */
function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

/**
 * Issue a full refund for a captured payment.
 * @param {string} paymentId   - razorpay_payment_id
 * @param {string} reason      - human-readable reason stored in notes
 */
async function refundPayment(paymentId, reason = 'bid_rejected') {
  const rz = getRazorpay();
  return rz.payments.refund(paymentId, {
    speed: 'normal',   // 'normal' = 5-7 days, 'optimum' = instant if eligible
    notes: { reason },
  });
}

/**
 * True if both Razorpay env vars are set (lets code degrade gracefully in dev).
 */
function isRazorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

module.exports = { createDepositOrder, verifySignature, refundPayment, isRazorpayConfigured, DEPOSIT_PAISE };
