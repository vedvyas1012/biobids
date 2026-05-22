const escrowClient = require('../config/escrow');

/**
 * Create a new Escrow.com transaction when a buyer initiates payment.
 * @param {object} order  - Sequelize Order instance
 * @param {string} buyerEmail
 * @param {string} sellerEmail
 * @param {object} opts   - Optional overrides: { biomassType, quantity, moisture, calorific, location, amountUSD }
 */
async function createEscrowTransaction(order, buyerEmail, sellerEmail, opts = {}) {
  const biomassType = opts.biomassType || 'Biomass';
  const quantity    = opts.quantity    || Number(order.quantity);
  const moisture    = opts.moisture    || '';
  const calorific   = opts.calorific   || '';
  const location    = opts.location    || '';
  // Convert paise → USD (rate configurable via ESCROW_INR_USD_RATE env var)
  const inrUsdRate  = parseFloat(process.env.ESCROW_INR_USD_RATE) || 83;
  const amountUSD   = opts.amountUSD   || parseFloat((order.total_amount / 100 / inrUsdRate).toFixed(2));

  const payload = {
    parties: [
      { role: 'buyer',  customer: buyerEmail  },
      { role: 'seller', customer: sellerEmail },
    ],
    currency: 'usd',
    description: `BioBids Order #${order.id} - ${biomassType} ${quantity}T`,
    items: [
      {
        title: `${biomassType} Biomass - ${quantity} tonnes`,
        description: moisture && calorific
          ? `Quality-verified biomass. Moisture: ${moisture}%, Calorific Value: ${calorific} kcal/kg. Location: ${location}`
          : `BioBids Order #${order.id}`,
        type: 'general_merchandise',
        inspection_period: 604800, // 7 days in seconds
        quantity,
        schedule: [
          {
            amount: amountUSD,
            payer_customer: buyerEmail,
            beneficiary_customer: sellerEmail,
          },
        ],
        fees: [
          { type: 'escrow', payer_customer: buyerEmail },
        ],
      },
    ],
  };

  const response = await escrowClient.post('/transaction', payload);
  return response.data;
}

/**
 * Retrieve transaction details by Escrow.com transaction ID.
 * Use this to verify webhook events before acting on them.
 */
async function getEscrowTransaction(transactionId) {
  const response = await escrowClient.get(`/transaction/${transactionId}`);
  return response.data;
}

/**
 * Agree to the transaction terms on behalf of a customer.
 * Both buyer and seller must agree before the transaction proceeds.
 */
async function agreeToTransaction(transactionId, customerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'agree' },
    { headers: { 'As-Customer': customerEmail } }
  );
  return response.data;
}

/**
 * Supplier marks items as shipped — triggers Escrow.com inspection period.
 */
async function markShipped(transactionId, sellerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'ship' },
    { headers: { 'As-Customer': sellerEmail } }
  );
  return response.data;
}

/**
 * Buyer confirms receipt of goods — starts inspection period on Escrow.com.
 * Payment is released after buyer explicitly accepts (transaction.accept webhook).
 */
async function confirmDeliveryEscrow(transactionId, buyerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'receive' },
    { headers: { 'As-Customer': buyerEmail } }
  );
  return response.data;
}

/**
 * Buyer rejects delivery — opens a dispute on Escrow.com.
 * Action: 'reject' (buyer rejecting initial delivery, not a return).
 * Field: rejection_information.rejection_reason per Escrow.com RejectInformation schema.
 */
async function rejectDelivery(transactionId, buyerEmail, reason = '') {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    {
      action: 'reject',
      rejection_information: { rejection_reason: reason },
    },
    { headers: { 'As-Customer': buyerEmail } }
  );
  return response.data;
}

/**
 * Admin releases funds to supplier by accepting on buyer's behalf.
 * Used in dispute resolution when admin decides in favour of supplier.
 */
async function acceptTransaction(transactionId, buyerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'accept' },
    { headers: { 'As-Customer': buyerEmail } }
  );
  return response.data;
}

/**
 * Admin accepts the return on seller's behalf — triggers refund to buyer.
 * Used in dispute resolution when admin decides in favour of buyer.
 */
async function acceptReturnAndRefund(transactionId, sellerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'accept_return' },
    { headers: { 'As-Customer': sellerEmail } }
  );
  return response.data;
}

/**
 * Register a customer with Escrow.com.
 * Handles HTTP 403 gracefully only when the error body confirms the email already exists.
 * Other 403s (bad credentials, permission denied) are re-thrown.
 */
async function createEscrowCustomer({ email, firstName, lastName, phone }) {
  try {
    const response = await escrowClient.post('/customer', {
      email,
      first_name: firstName,
      last_name:  lastName || undefined,
      phone_number: phone || undefined,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 403) {
      const errBody = err.response?.data || {};
      const errMsg  = String(errBody.error || errBody.message || '').toLowerCase();
      // Only treat as "already exists" when the error body explicitly says so
      if (errMsg.includes('already') || errMsg.includes('exist')) {
        return { existing: true, email };
      }
    }
    throw err;
  }
}

/**
 * Get the buyer's payment URL for a transaction.
 * Prefers explicit ESCROW_WEB_BASE_URL env var; falls back to sandbox detection.
 */
function getPaymentLink(transactionId) {
  const webBase = process.env.ESCROW_WEB_BASE_URL
    || ((process.env.ESCROW_BASE_URL || '').includes('sandbox')
        ? 'https://www.escrow-sandbox.com'
        : 'https://www.escrow.com');
  return `${webBase}/transactions/${transactionId}/payment`;
}

module.exports = {
  createEscrowTransaction,
  getEscrowTransaction,
  agreeToTransaction,
  markShipped,
  confirmDeliveryEscrow,
  rejectDelivery,
  acceptTransaction,
  acceptReturnAndRefund,
  createEscrowCustomer,
  getPaymentLink,
};
