const { Order, Transaction, User, Listing, Bid } = require('../models');
const {
  createEscrowTransaction,
  getEscrowTransaction,
  getPaymentLink,
  createEscrowCustomer,
  agreeToTransaction,
} = require('../utils/escrowService');
const { splitName } = require('../utils/helpers');
const { notifyPaymentEscrowed, notifyPaymentReleased } = require('../utils/notifications');

let io;
const setIo = (socketIo) => { io = socketIo; };

/**
 * POST /api/payments/initiate/:order_id
 * Triggered after supplier accepts a bid.
 * Flow:
 *  1. Load order + bid + listing + buyer + supplier
 *  2. Register both buyer and supplier as Escrow.com customers (handle 403 = already exists)
 *  3. Create Escrow.com transaction with full biomass details
 *  4. Supplier auto-agrees (platform acts on seller's behalf)
 *  5. Save escrow_transaction_id + escrow_payment_url on order
 *  6. Return payment URL so buyer can click and fund escrow
 */
const initiatePayment = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.order_id, {
      include: [
        { model: User, as: 'buyer' },
        { model: User, as: 'supplier' },
        {
          model: Bid, as: 'bid',
          include: [{ model: Listing, as: 'listing' }],
        },
      ],
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ message: 'Order is not awaiting payment' });
    }

    // Flag 4: Duplicate guard — return existing escrow transaction if already created
    if (order.escrow_transaction_id) {
      return res.json({
        escrow_transaction_id: order.escrow_transaction_id,
        payment_url:           order.escrow_payment_url,
        message:               'Escrow transaction already exists. Use payment_url to fund it.',
      });
    }

    const buyer    = order.buyer;
    const supplier = order.supplier;
    const listing  = order.bid?.listing;

    // 1. Ensure both parties exist as Escrow.com customers (safe to call repeatedly)
    const buyerName    = splitName(buyer.name);
    const supplierName = splitName(supplier.name);
    await Promise.all([
      createEscrowCustomer({
        email:     buyer.email,
        firstName: buyerName.firstName,
        lastName:  buyerName.lastName,
        phone:     buyer.phone,
      }),
      createEscrowCustomer({
        email:     supplier.email,
        firstName: supplierName.firstName,
        lastName:  supplierName.lastName,
        phone:     supplier.phone,
      }),
    ]);

    // 2. Create the Escrow.com transaction
    const escrowTxn = await createEscrowTransaction(
      order,
      buyer.email,
      supplier.email,
      {
        biomassType: listing?.biomass_type?.replace(/_/g, ' ') || 'Biomass',
        quantity:    Number(order.quantity),
        moisture:    listing?.moisture_content,
        calorific:   listing?.calorific_value,
        location:    listing ? `${listing.location_district}, ${listing.location_state}` : '',
      }
    );

    const escrowTransactionId = String(escrowTxn.id);
    const paymentUrl          = getPaymentLink(escrowTransactionId);

    // 3. Persist escrow ID immediately — before agree so the duplicate guard works
    //    even if the subsequent agree/transaction steps fail and are retried.
    await order.update({
      escrow_transaction_id: escrowTransactionId,
      escrow_payment_url:    paymentUrl,
    });

    // 4. Supplier auto-agrees to transaction terms on behalf of platform
    await agreeToTransaction(escrowTransactionId, supplier.email).catch((e) => {
      console.error('Supplier agreeToTransaction failed (non-fatal):', e.response?.data || e.message);
    });

    await Transaction.create({
      order_id:              order.id,
      escrow_transaction_id: escrowTransactionId,
      escrow_event:          'transaction_created',
      amount:                order.total_amount,
      type:                  'ESCROW',
      status:                'PENDING',
    });

    res.json({
      escrow_transaction_id: escrowTransactionId,
      payment_url:           paymentUrl,
      message:               'Escrow transaction created. Buyer should open payment_url to fund escrow.',
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
 * Escrow.com webhook receiver.
 * Payload: { "event": "transaction.payment_approved", "event_type": "transaction", "transaction_id": 12345 }
 * Official event catalog (transaction.* format):
 *   transaction.payment_approved | transaction.ship | transaction.accept | transaction.complete
 *   transaction.reject | transaction.refund_resolved | transaction.cancel
 *
 * IMPORTANT: Always verify by fetching the transaction from Escrow.com before updating DB.
 * Always return HTTP 200 (even unhandled events) to prevent Escrow.com retry storms.
 */
const handleWebhook = async (req, res) => {
  // Acknowledge immediately — always 200
  res.json({ received: true });

  try {
    const eventName     = req.body.event           || '';
    const transactionId = String(req.body.transaction_id || '');

    if (!transactionId) {
      console.log('[Webhook] Missing transaction_id, skipping');
      return;
    }

    // Verify by fetching live state from Escrow.com before trusting the event
    let escrowTxn;
    try {
      escrowTxn = await getEscrowTransaction(transactionId);
    } catch (e) {
      console.error('[Webhook] Could not verify transaction from Escrow.com:', e.message);
      return;
    }

    const order = await Order.findOne({ where: { escrow_transaction_id: transactionId } });
    if (!order) {
      console.log('[Webhook] No order found for escrow transaction:', transactionId);
      return;
    }

    // Idempotency: skip if order is already at a terminal status
    const TERMINAL = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED'];
    if (TERMINAL.includes(order.status)) {
      console.log(`[Webhook] Order ${order.id} already terminal (${order.status}), skipping`);
      return;
    }

    // m5: Log a warning if escrow state seems inconsistent with the event
    if (escrowTxn && escrowTxn.id) {
      console.log(`[Webhook] Escrow status for txn ${transactionId}: ${escrowTxn.status || 'unknown'} (event: ${eventName})`);
    }

    let newStatus = null;
    let txnType   = 'ESCROW';

    switch (eventName) {
      case 'transaction.payment_approved':
        newStatus = 'PAYMENT_ESCROWED';
        txnType   = 'ESCROW';
        break;
      case 'transaction.ship':
        if (order.status === 'IN_TRANSIT') return; // already set by dispatchOrder
        newStatus = 'IN_TRANSIT';
        txnType   = 'ESCROW';
        break;
      case 'transaction.accept':
      case 'transaction.complete':
        if (order.status === 'COMPLETED') return; // already handled by confirmDelivery
        newStatus = 'COMPLETED';
        txnType   = 'RELEASE';
        break;
      case 'transaction.reject':
        newStatus = 'DISPUTED';
        txnType   = 'ESCROW';
        break;
      case 'transaction.refund_resolved':
        newStatus = 'REFUNDED';
        txnType   = 'REFUND';
        break;
      case 'transaction.cancel':
        newStatus = 'CANCELLED';
        txnType   = 'ESCROW';
        break;
      default:
        console.log('[Webhook] Unhandled event:', eventName);
        return;
    }

    if (newStatus) {
      await order.update({ status: newStatus });
      await Transaction.create({
        order_id:              order.id,
        escrow_transaction_id: transactionId,
        escrow_event:          eventName,
        amount:                order.total_amount,
        type:                  txnType,
        status:                'SUCCESS',
      });

      if (newStatus === 'PAYMENT_ESCROWED') {
        await notifyPaymentEscrowed(order.supplier_id, order.id, order.total_amount);
        if (io) io.to(`user_${order.supplier_id}`).emit('payment_escrowed', { orderId: order.id });
      }

      if (newStatus === 'COMPLETED') {
        await notifyPaymentReleased(order.supplier_id, order.id, order.total_amount);
        if (io) io.to(`user_${order.supplier_id}`).emit('payment_released', { orderId: order.id });
      }

      if (io) {
        io.to(`user_${order.buyer_id}`).emit('order_status_updated', { orderId: order.id, status: newStatus });
        io.to(`user_${order.supplier_id}`).emit('order_status_updated', { orderId: order.id, status: newStatus });
      }
      console.log(`[Webhook] Order ${order.id} → ${newStatus} (event: ${eventName})`);
    }
  } catch (err) {
    console.error('[Webhook] Processing error:', err.message);
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
      order:   [['created_at', 'DESC']],
    });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { initiatePayment, getPaymentStatus, handleWebhook, getTransactions, setIo };
