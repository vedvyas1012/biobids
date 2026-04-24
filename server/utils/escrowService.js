const escrowClient = require('../config/escrow');

/**
 * Create a new Escrow.com transaction when a buyer initiates payment.
 * amounts must be in USD (not paise).
 */
async function createEscrowTransaction({ buyerEmail, sellerEmail, description, amountUSD, inspectionDays = 7 }) {
  const payload = {
    currency: 'usd',
    description,
    parties: [
      { role: 'buyer', customer: buyerEmail },
      { role: 'seller', customer: sellerEmail },
    ],
    items: [
      {
        title: description,
        description,
        type: 'general_merchandise',
        quantity: 1,
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
            split: { buyer: 0.5, seller: 0.5 },
          },
        ],
        inspection_period: inspectionDays * 86400,
        who_gets_fees: 'buyer',
        extra_attributes: { with_broker_commission: false },
      },
    ],
  };

  const response = await escrowClient.post('/transaction', payload);
  return response.data;
}

/**
 * Retrieve transaction details by Escrow.com transaction ID.
 */
async function getEscrowTransaction(transactionId) {
  const response = await escrowClient.get(`/transaction/${transactionId}`);
  return response.data;
}

/**
 * Buyer or seller agrees to the transaction terms.
 * role: 'buyer' | 'seller'
 */
async function agreeToTransaction(transactionId, customerEmail) {
  const response = await escrowClient.patch(`/transaction/${transactionId}`, {
    action: { type: 'agree', customer: customerEmail },
  });
  return response.data;
}

/**
 * Seller marks items as shipped — triggers Escrow.com to start inspection period.
 */
async function markShipped(transactionId, sellerEmail) {
  const response = await escrowClient.patch(`/transaction/${transactionId}`, {
    action: { type: 'ship_merchandise', customer: sellerEmail },
  });
  return response.data;
}

/**
 * Buyer confirms delivery — releases funds to seller.
 */
async function confirmDeliveryEscrow(transactionId, buyerEmail) {
  const response = await escrowClient.patch(`/transaction/${transactionId}`, {
    action: { type: 'receive_merchandise', customer: buyerEmail },
  });
  return response.data;
}

/**
 * Buyer rejects delivery — initiates dispute / return process.
 */
async function rejectDelivery(transactionId, buyerEmail) {
  const response = await escrowClient.patch(`/transaction/${transactionId}`, {
    action: { type: 'reject_merchandise', customer: buyerEmail },
  });
  return response.data;
}

/**
 * Register a customer with Escrow.com (needed before creating transactions).
 */
async function createEscrowCustomer({ email, firstName, lastName }) {
  const response = await escrowClient.post('/customer', {
    email,
    first_name: firstName,
    last_name: lastName,
  });
  return response.data;
}

/**
 * Get the pay-in link for a transaction so the buyer can fund escrow.
 * Returns the checkout URL from the transaction's payment_methods.
 */
async function getPaymentLink(transactionId) {
  const txn = await getEscrowTransaction(transactionId);
  // Escrow.com provides a checkout URL in payment_methods
  if (txn.payment_methods && txn.payment_methods.length > 0 && txn.payment_methods[0].checkout_url) {
    return txn.payment_methods[0].checkout_url;
  }
  // Fallback: derive web URL from API base URL (sandbox vs production)
  const isSandbox = (process.env.ESCROW_BASE_URL || '').includes('sandbox');
  const webBase = isSandbox ? 'https://www.escrow-sandbox.com' : 'https://www.escrow.com';
  return `${webBase}/transactions/${transactionId}`;
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
