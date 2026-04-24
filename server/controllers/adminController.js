const { Op, fn, col, literal } = require('sequelize');
const { User, Listing, Order, Transaction, Dispute, Bid, Notification } = require('../models');
const { createNotification } = require('../utils/notifications');
const { acceptTransaction, acceptReturnAndRefund } = require('../utils/escrowService');

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'refresh_token'] },
      order: [['created_at', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllListings = async (req, res) => {
  try {
    const listings = await Listing.findAll({
      include: [{ model: User, as: 'supplier', attributes: ['name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'supplier', attributes: ['name', 'email'] },
        { model: User, as: 'buyer', attributes: ['name', 'email'] },
        { model: Listing, as: 'listing', attributes: ['biomass_type', 'location_state'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const txns = await Transaction.findAll({
      include: [{ model: Order, as: 'order' }],
      order: [['created_at', 'DESC']],
    });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.findAll({
      include: [
        { model: Order, as: 'order' },
        { model: User, as: 'raisedBy', attributes: ['name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const { resolution, action } = req.body; // action: 'release_to_supplier' | 'refund_buyer'
    const dispute = await Dispute.findByPk(req.params.id, {
      include: [{ model: Order, as: 'order' }],
    });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });

    const order = dispute.order;

    if (action === 'release_to_supplier') {
      // 1. Unfreeze funds on Escrow.com first — only persist RESOLVED if it succeeds
      if (order.escrow_transaction_id) {
        const buyer = await User.findByPk(order.buyer_id, { attributes: ['email'] });
        if (buyer) {
          try {
            await acceptTransaction(order.escrow_transaction_id, buyer.email);
          } catch (e) {
            console.error(`[Admin] acceptTransaction failed for order ${order.id}:`, e.response?.data || e.message);
            return res.status(502).json({ message: 'Escrow.com could not release funds. Please retry.' });
          }
        }
      }
      // 2. Escrow confirmed — now update local state
      await dispute.update({ status: 'RESOLVED', resolution, admin_id: req.user.id });
      await order.update({ status: 'COMPLETED' });
      await Transaction.create({
        order_id: order.id,
        escrow_transaction_id: order.escrow_transaction_id || null,
        escrow_event: 'admin_release',
        amount: order.total_amount,
        type: 'RELEASE',
        status: 'SUCCESS',
      });
      await createNotification({ userId: order.supplier_id, title: 'Dispute Resolved — Payment Released', message: resolution, type: 'dispute_resolved', referenceId: order.id });
      await createNotification({ userId: order.buyer_id, title: 'Dispute Resolved', message: resolution, type: 'dispute_resolved', referenceId: order.id });
    } else if (action === 'refund_buyer') {
      // 1. Trigger refund on Escrow.com first — only persist RESOLVED if it succeeds
      if (order.escrow_transaction_id) {
        const supplier = await User.findByPk(order.supplier_id, { attributes: ['email'] });
        if (supplier) {
          try {
            await acceptReturnAndRefund(order.escrow_transaction_id, supplier.email);
          } catch (e) {
            console.error(`[Admin] acceptReturnAndRefund failed for order ${order.id}:`, e.response?.data || e.message);
            return res.status(502).json({ message: 'Escrow.com could not process the refund. Please retry.' });
          }
        }
      }
      // 2. Escrow confirmed — now update local state
      await dispute.update({ status: 'RESOLVED', resolution, admin_id: req.user.id });
      await order.update({ status: 'REFUNDED' });
      await Transaction.create({
        order_id: order.id,
        escrow_transaction_id: order.escrow_transaction_id || null,
        escrow_event: 'admin_refund',
        amount: order.total_amount,
        type: 'REFUND',
        status: 'SUCCESS',
      });
      await createNotification({ userId: order.buyer_id, title: 'Dispute Resolved — Refund Initiated', message: resolution, type: 'dispute_resolved', referenceId: order.id });
    } else {
      return res.status(400).json({ message: 'Invalid action. Use release_to_supplier or refund_buyer.' });
    }

    res.json({ message: 'Dispute resolved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const [totalUsers, totalListings, totalOrders, transactions] = await Promise.all([
      User.count(),
      Listing.count(),
      Order.count(),
      Transaction.findAll({ where: { status: 'SUCCESS', type: 'ESCROW' } }),
    ]);

    const gmv = transactions.reduce((sum, t) => sum + parseInt(t.amount), 0);

    const completedOrders = await Order.count({ where: { status: 'COMPLETED' } });
    const activeListings = await Listing.count({ where: { status: 'ACTIVE' } });

    // Orders by state
    const ordersByState = await Order.findAll({
      attributes: ['listings.location_state', [fn('COUNT', col('Order.id')), 'count']],
      include: [{ model: Listing, as: 'listing', attributes: [] }],
      group: ['listings.location_state'],
      raw: true,
    });

    // Biomass type distribution
    const byBiomassType = await Listing.findAll({
      attributes: ['biomass_type', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('quantity')), 'total_quantity']],
      group: ['biomass_type'],
      raw: true,
    });

    // Monthly GMV (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTxns = await Transaction.findAll({
      where: { status: 'SUCCESS', type: 'ESCROW', created_at: { [Op.gte]: sixMonthsAgo } },
      attributes: [[fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'], [fn('SUM', col('amount')), 'total']],
      group: [literal("DATE_FORMAT(created_at, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(created_at, '%Y-%m')"), 'ASC']],
      raw: true,
    });

    res.json({
      summary: { totalUsers, totalListings, totalOrders, completedOrders, activeListings, gmv },
      ordersByState,
      byBiomassType,
      monthlyGmv: monthlyTxns,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSupplierAnalytics = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const orders = await Order.findAll({ where: { supplier_id: supplierId } });
    const earnings = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + parseInt(o.total_amount), 0);
    const listingCount = await Listing.count({ where: { supplier_id: supplierId } });
    const avgBid = await Bid.findOne({
      attributes: [[fn('AVG', col('price_per_tonne')), 'avg']],
      include: [{ model: Listing, as: 'listing', where: { supplier_id: supplierId }, attributes: [] }],
      raw: true,
    });
    res.json({ earnings, listingCount, avgBidPricePaise: avgBid?.avg || 0, orderCount: orders.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBuyerAnalytics = async (req, res) => {
  try {
    const buyerId = req.user.id;
    const orders = await Order.findAll({
      where: { buyer_id: buyerId },
      include: [{ model: Listing, as: 'listing', attributes: ['biomass_type'] }],
    });
    const totalSpend = orders.filter(o => o.status === 'COMPLETED')
      .reduce((s, o) => s + parseInt(o.total_amount), 0);
    const byType = {};
    orders.forEach(o => {
      const t = o.listing?.biomass_type || 'other';
      byType[t] = (byType[t] || 0) + 1;
    });
    res.json({ totalSpend, orderCount: orders.length, byBiomassType: byType });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, getAllListings, getAllOrders, getAllTransactions, getDisputes, resolveDispute, getAnalytics, getSupplierAnalytics, getBuyerAnalytics };
