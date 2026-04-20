const { Order, Bid, Listing, User, Dispute, Transaction } = require('../models');
const { notifyOrderDispatched, createNotification } = require('../utils/notifications');
const path = require('path');

let io;
const setIo = (socketIo) => { io = socketIo; };

const getOrders = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'supplier') where.supplier_id = req.user.id;
    else if (req.user.role === 'buyer') where.buyer_id = req.user.id;

    const orders = await Order.findAll({
      where,
      include: [
        { model: Listing, as: 'listing', attributes: ['biomass_type', 'location_state', 'location_district'] },
        { model: User, as: 'supplier', attributes: ['name'] },
        { model: User, as: 'buyer', attributes: ['name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Listing, as: 'listing' },
        { model: User, as: 'supplier', attributes: ['id', 'name', 'phone'] },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone'] },
        { model: Bid, as: 'bid' },
        { model: Transaction, as: 'transactions' },
        { model: Dispute, as: 'dispute' },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isParty = [order.supplier_id, order.buyer_id].includes(req.user.id) || req.user.role === 'admin';
    if (!isParty) return res.status(403).json({ message: 'Unauthorized' });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const dispatchOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.supplier_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'PAYMENT_ESCROWED') {
      return res.status(400).json({ message: 'Payment must be escrowed before dispatch' });
    }

    const { vehicle_number, driver_contact, estimated_delivery } = req.body;
    const dispatch_proof_url = req.file ? `/uploads/dispatch/${req.file.filename}` : null;
    const autoRelease = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await order.update({
      status: 'IN_TRANSIT',
      dispatch_date: new Date().toISOString().split('T')[0],
      vehicle_number, driver_contact, estimated_delivery,
      dispatch_proof_url,
      auto_release_at: autoRelease,
    });

    await notifyOrderDispatched(order.buyer_id, order.id, vehicle_number);
    if (io) io.to(`user_${order.buyer_id}`).emit('order_status_update', { orderId: order.id, status: 'IN_TRANSIT' });

    res.json({ message: 'Order marked as dispatched', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const confirmDelivery = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'IN_TRANSIT') {
      return res.status(400).json({ message: 'Order is not in transit' });
    }

    await order.update({ status: 'DELIVERED', delivery_confirmed_at: new Date() });

    // Auto-release payment
    const { releasePayment } = require('./paymentController');
    req.params.order_id = order.id;
    await releasePayment(req, res);

    if (io) io.to(`user_${order.supplier_id}`).emit('order_status_update', { orderId: order.id, status: 'DELIVERED' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const raiseDispute = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyer_id !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    if (order.status !== 'IN_TRANSIT') {
      return res.status(400).json({ message: 'Can only dispute in-transit orders' });
    }

    const { reason } = req.body;
    const evidence_url = req.file ? `/uploads/disputes/${req.file.filename}` : null;

    await order.update({ status: 'DISPUTED' });
    await Dispute.create({ order_id: order.id, raised_by: req.user.id, reason, evidence_url });

    await createNotification({
      userId: order.supplier_id, title: 'Dispute Raised',
      message: `Buyer has raised a dispute on order #${order.id}. Admin will review.`,
      type: 'dispute_raised', referenceId: order.id,
    });

    res.json({ message: 'Dispute raised. Admin will review within 48 hours.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOrders, getOrderById, dispatchOrder, confirmDelivery, raiseDispute, setIo };
