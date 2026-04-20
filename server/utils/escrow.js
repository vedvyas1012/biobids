// Escrow auto-release cron job (runs every hour)
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Order, Transaction } = require('../models');
const { notifyPaymentReleased } = require('./notifications');

let io;
const setIo = (socketIo) => { io = socketIo; };

const startEscrowCron = () => {
  // Check every hour for orders that need auto-release (7 days after dispatch)
  cron.schedule('0 * * * *', async () => {
    try {
      const overdueOrders = await Order.findAll({
        where: {
          status: 'IN_TRANSIT',
          auto_release_at: { [Op.lte]: new Date() },
        },
      });

      for (const order of overdueOrders) {
        await order.update({ status: 'COMPLETED' });
        await Transaction.create({
          order_id: order.id, amount: order.total_amount,
          type: 'RELEASE', status: 'SUCCESS',
        });
        await notifyPaymentReleased(order.supplier_id, order.id, order.total_amount);
        if (io) io.to(`user_${order.supplier_id}`).emit('payment_released', { orderId: order.id });
        console.log(`[Cron] Auto-released payment for order ${order.id}`);
      }
    } catch (err) {
      console.error('[Cron] Escrow auto-release error:', err.message);
    }
  });

  // Expire bids older than 48 hours
  cron.schedule('0 * * * *', async () => {
    try {
      const { Bid } = require('../models');
      const expired = await Bid.update(
        { status: 'EXPIRED' },
        { where: { status: 'PENDING', expires_at: { [Op.lte]: new Date() } } }
      );
      if (expired[0] > 0) console.log(`[Cron] Expired ${expired[0]} bids`);
    } catch (err) {
      console.error('[Cron] Bid expiry error:', err.message);
    }
  });
};

module.exports = { startEscrowCron, setIo };
