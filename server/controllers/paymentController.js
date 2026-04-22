const crypto = require('crypto');
const getRazorpay = require('../config/razorpay');
const { Order, Transaction, User } = require('../models');
const { verifyRazorpaySignature } = require('../utils/helpers');
const { notifyPaymentEscrowed, notifyPaymentReleased } = require('../utils/notifications');

let io;
const setIo = (socketIo) => { io = socketIo; };

const createPaymentOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ message: 'Order is not awaiting payment' });
    }

    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ message: 'Payment gateway not configured. Add Razorpay keys to .env to enable payments.' });

    const rzpOrder = await razorpay.orders.create({
      amount: order.total_amount, // already in paise
      currency: 'INR',
      receipt: `order_${order.id}`,
      notes: { biobids_order_id: order.id },
    });

    await order.update({ razorpay_order_id: rzpOrder.id });
    await Transaction.create({
      order_id: order.id, razorpay_order_id: rzpOrder.id,
      amount: order.total_amount, type: 'ESCROW', status: 'PENDING',
    });

    res.json({
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return res.status(400).json({ message: 'Invalid payment signature' });

    const order = await Order.findOne({ where: { razorpay_order_id } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    await order.update({ status: 'PAYMENT_ESCROWED', escrow_payment_id: razorpay_payment_id });

    await Transaction.update(
      { razorpay_payment_id, razorpay_signature, status: 'SUCCESS' },
      { where: { razorpay_order_id } }
    );

    await notifyPaymentEscrowed(order.supplier_id, order.id, order.total_amount);

    if (io) {
      io.to(`user_${order.supplier_id}`).emit('payment_escrowed', { orderId: order.id });
    }

    res.json({ message: 'Payment verified and escrowed', order_id: order.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const releasePayment = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.order_id, {
      include: [{ model: User, as: 'supplier' }],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['DELIVERED', 'PAYMENT_ESCROWED'].includes(order.status) && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'Cannot release payment at this stage' });
    }

    // In production: use Razorpay Payouts API to transfer to supplier
    // For demo/test: just mark as completed
    await order.update({ status: 'COMPLETED' });
    await Transaction.create({
      order_id: order.id,
      amount: order.total_amount,
      type: 'RELEASE',
      status: 'SUCCESS',
    });

    await notifyPaymentReleased(order.supplier_id, order.id, order.total_amount);
    if (io) io.to(`user_${order.supplier_id}`).emit('payment_released', { orderId: order.id });

    res.json({ message: 'Payment released to supplier' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
      where, include: [{ model: Order, as: 'order' }], order: [['created_at', 'DESC']],
    });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment, releasePayment, getTransactions, setIo };
