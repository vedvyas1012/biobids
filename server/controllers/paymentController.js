const { Order, Transaction, User } = require('../models');
const {
  createEscrowTransaction,
  getEscrowTransaction,
  getPaymentLink,
} = require('../utils/escrowService');
const { notifyPaymentEscrowed, notifyPaymentReleased } = require('../utils/notifications');

let io;
const setIo = (socketIo) => { io = socketIo; };

/**
 * POST /api/payments/initiate/:order_id
 * Buyer initiates escrow — creates Escrow.com transaction, stores ID + payment URL on order.
 */
const initiatePayment = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.order_id, {
      include: [
        { model: User, as: 'buyer' },
        { model: User, as: 'supplier' },
      ],
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ message: 'Order is not awaiting payment' });
    }

    // Convert paise → USD (1 USD ≈ 83 INR; amount stored in paise = INR/100)
    const amountINR = order.total_amount / 100;
    const amountUSD = parseFloat((amountINR / 83).toFixed(2));

    const escrowTxn = await createEscrowTransaction({
      buyerEmail: order.buyer.email,
      sellerEmail: order.supplier.email,
      description: `BioBids Order #${order.id}`,
      amountUSD,
    });

    const paymentUrl = await getPaymentLink(escrowTxn.id);

    await order.update({
      escrow_transaction_id: String(escrowTxn.id),
      escrow_payment_url: paymentUrl,
    });

    await Transaction.create({
      order_id: order.id,
      escrow_transaction_id: String(escrowTxn.id),
      escrow_event: 'TRANSACTION_CREATED',
      amount: order.total_amount,
      type: 'ESCROW',
      status: 'PENDING',
    });

    res.json({
      escrow_transaction_id: escrowTxn.id,
      payment_url: paymentUrl,
      amount_usd: amountUSD,
    });
  } catch (err) {
    console.error('initiatePayment error:', err.response?.data || err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/payments/status/:order_id
 * Returns current Escrow.com transaction status for an order.
 */
const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.order_id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Auth: buyer, supplier, or admin
    if (req.user.role !== 'admin' && order.buyer_id !== req.user.id && order.supplier_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!order.escrow_transaction_id) {
      return res.json({ status: order.status, escrow_transaction: null });
    }

    const escrowTxn = await getEscrowTransaction(order.escrow_transaction_id);
    res.json({ status: order.status, escrow_transaction: escrowTxn });
  } catch (err) {
    console.error('getPaymentStatus error:', err.response?.data || err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/payments/webhook
 * Escrow.com webhook — updates order status based on escrow events.
 */
const handleWebhook = async (req, res) => {
  try {
    const event = req.body;

    // Escrow.com sends { action: { type: ... }, id: transactionId }
    const transactionId = String(event.id || event.transaction_id || '');
    const actionType = event.action?.type || event.type || '';

    if (!transactionId) return res.status(400).json({ message: 'Missing transaction id' });

    const order = await Order.findOne({ where: { escrow_transaction_id: transactionId } });
    if (!order) return res.status(404).json({ message: 'Order not found for transaction' });

    // Idempotency: if order is already at terminal status, acknowledge without re-processing
    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REFUNDED'];
    if (TERMINAL.includes(order.status)) {
      return res.json({ received: true, skipped: true, reason: 'Order already in terminal state' });
    }

    let newStatus = null;
    let txnType = 'ESCROW';

    switch (actionType) {
      case 'buyer_paid':
      case 'payment_received':
        newStatus = 'PAYMENT_ESCROWED';
        txnType = 'ESCROW';
        break;
      case 'ship_merchandise':
        // Supplier shipped — status already set by dispatchOrder; skip duplicate
        if (order.status === 'IN_TRANSIT') return res.json({ received: true, skipped: true });
        newStatus = 'IN_TRANSIT';
        txnType = 'ESCROW';
        break;
      case 'receive_merchandise':
        // Buyer confirmed — status may already be COMPLETED from confirmDelivery; skip
        if (order.status === 'COMPLETED') return res.json({ received: true, skipped: true });
        newStatus = 'COMPLETED';
        txnType = 'RELEASE';
        break;
      case 'completed':
        if (order.status === 'COMPLETED') return res.json({ received: true, skipped: true });
        newStatus = 'COMPLETED';
        txnType = 'RELEASE';
        break;
      case 'dispute_opened':
        newStatus = 'DISPUTED';
        txnType = 'ESCROW';
        break;
      case 'refund':
      case 'refund_approved':
        newStatus = 'REFUNDED';
        txnType = 'REFUND';
        break;
      default:
        console.log('Unhandled Escrow webhook event:', actionType);
    }

    if (newStatus) {
      await order.update({ status: newStatus });
      await Transaction.create({
        order_id: order.id,
        escrow_transaction_id: transactionId,
        escrow_event: actionType,
        amount: order.total_amount,
        type: txnType,
        status: 'SUCCESS',
      });

      if (newStatus === 'PAYMENT_ESCROWED') {
        await notifyPaymentEscrowed(order.supplier_id, order.id, order.total_amount);
        if (io) io.to(`user_${order.supplier_id}`).emit('payment_escrowed', { orderId: order.id });
      }

      if (newStatus === 'COMPLETED') {
        await notifyPaymentReleased(order.supplier_id, order.id, order.total_amount);
        if (io) io.to(`user_${order.supplier_id}`).emit('payment_released', { orderId: order.id });
      }

      if (io) io.to(`order_${order.id}`).emit('order_status_updated', { orderId: order.id, status: newStatus });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('webhook error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/payments/transactions
 * List transactions for the authenticated user (or all for admin).
 */
const getTransactions = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'admin') {
      const orders = await Order.findAll({
        where: req.user.role === 'buyer' ? { buyer_id: req.user.id } : { supplier_id: req.user.id },
        attributes: ['id'],
      });
      where.order_id = orders.map((o) => o.id);
    }
    const txns = await Transaction.findAll({
      where,
      include: [{ model: Order, as: 'order' }],
      order: [['created_at', 'DESC']],
    });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { initiatePayment, getPaymentStatus, handleWebhook, getTransactions, setIo };
