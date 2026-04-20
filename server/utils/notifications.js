const { Notification } = require('../models');
const { sendMail } = require('../config/mailer');

const createNotification = async ({ userId, title, message, type = 'general', referenceId = null }) => {
  await Notification.create({ user_id: userId, title, message, type, reference_id: referenceId });
};

const notifyBidReceived = async (supplierId, buyerName, listingId, amount) => {
  await createNotification({
    userId: supplierId,
    title: 'New Bid Received',
    message: `${buyerName} placed a bid of ₹${(amount / 100).toLocaleString('en-IN')}/tonne on your listing.`,
    type: 'bid_received',
    referenceId: listingId,
  });
};

const notifyBidAccepted = async (buyerId, listingTitle, orderId) => {
  await createNotification({
    userId: buyerId,
    title: 'Bid Accepted!',
    message: `Your bid has been accepted. Please complete payment to secure the order.`,
    type: 'bid_accepted',
    referenceId: orderId,
  });
};

const notifyBidRejected = async (buyerId, listingId) => {
  await createNotification({
    userId: buyerId,
    title: 'Bid Rejected',
    message: `Your bid was not selected by the supplier.`,
    type: 'bid_rejected',
    referenceId: listingId,
  });
};

const notifyPaymentEscrowed = async (supplierId, orderId, amount) => {
  await createNotification({
    userId: supplierId,
    title: 'Payment Secured in Escrow',
    message: `₹${(amount / 100).toLocaleString('en-IN')} has been secured in escrow. You can now dispatch the biomass.`,
    type: 'payment_escrowed',
    referenceId: orderId,
  });
};

const notifyOrderDispatched = async (buyerId, orderId, vehicleNumber) => {
  await createNotification({
    userId: buyerId,
    title: 'Order Dispatched',
    message: `Your biomass order has been dispatched. Vehicle: ${vehicleNumber}`,
    type: 'order_dispatched',
    referenceId: orderId,
  });
};

const notifyPaymentReleased = async (supplierId, orderId, amount) => {
  await createNotification({
    userId: supplierId,
    title: 'Payment Released!',
    message: `₹${(amount / 100).toLocaleString('en-IN')} has been released to your account.`,
    type: 'payment_released',
    referenceId: orderId,
  });
};

module.exports = {
  createNotification,
  notifyBidReceived,
  notifyBidAccepted,
  notifyBidRejected,
  notifyPaymentEscrowed,
  notifyOrderDispatched,
  notifyPaymentReleased,
};
