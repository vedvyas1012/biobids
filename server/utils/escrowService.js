const escrowClient = require('../config/escrow');

/**
 * Create a new Escrow.com transaction when a buyer initiates payment.
 * @param {object} order  - Sequelize Order instance (must include bid → listing for quality specs)
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
  // Convert paise → USD (1 USD ≈ 83 INR; paise = INR/100)
  const amountUSD   = opts.amountUSD   || parseFloat((order.total_amount / 100 / 83).toFixed(2));

  const payload = {
    parties: [
      { role: 'buyer',  customer: buyerEmail  },
      { role: 'seller', customer: sellerEmail },
    ],
    currency: 'usd',
    description: `BioBids Order #${order.id} — ${biomassType} ${quantity}T`,
    items: [
      {
        title: `${biomassType} Biomass — ${quantity} tonnes`,
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
          {
            type: 'escrow',
            split: 0.5,
          },
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
 * Uses As-Customer header per Escrow.com API spec.
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
 * Uses As-Customer header per Escrow.com API spec.
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
 * Buyer confirms delivery — releases funds to seller.
 * Uses As-Customer header per Escrow.com API spec.
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
 * Uses As-Customer header per Escrow.com API spec.
 */
async function rejectDelivery(transactionId, buyerEmail) {
  const response = await escrowClient.patch(
    `/transaction/${transactionId}`,
    { action: 'reject' },
    { headers: { 'As-Customer': buyerEmail } }
  );
  return response.data;
}

/**
 * Register a customer with Escrow.com.
 * Call this during user registration so the customer exists before any transaction.
 * Handles HTTP 403 gracefully — means the customer already exists, which is fine.
 */
async function createEscrowCustomer({ email, firstName, lastName, phone }) {
  try {
    const response = await escrowClient.post('/customer', {
      email,
      first_name: firstName,
      last_name:  lastName,
      phone_number: phone || undefined,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 403) {
      // Customer already exists in Escrow.com — that's fine
      return { existing: true, email };
    }
    throw err;
  }
}

/**
 * Get the buyer's payment URL for a transaction.
 * This is Escrow.com's hosted payment page — no API call needed, just URL construction.
 * Sandbox:    https://www.escrow-sandbox.com/transactions/<id>/payment
 * Production: https://www.escrow.com/transactions/<id>/payment
 */
function getPaymentLink(transactionId) {
  const isSandbox = (process.env.ESCROW_BASE_URL || '').includes('sandbox');
  const webBase   = isSandbox ? 'https://www.escrow-sandbox.com' : 'https://www.escrow.com';
  return `${webBase}/transactions/${transactionId}/payment`;
}

module.exports = {
  createEscrowTransaction,
  getEscrowTransaction,
  agreeToTransaction,
  markShipped,
  confirmDeliveryEscrow,
  rejectDelivery,
  createEscrowCustomer,
  getPaymentLink,
};
