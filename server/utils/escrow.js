// Escrow auto-release cron job (runs every hour)
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Order, Transaction, User } = require('../models');
const { notifyPaymentReleased } = require('./notifications');
const { confirmDeliveryEscrow } = require('./escrowService');

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
        // Notify Escrow.com that buyer implicitly accepted (auto-release)
        if (order.escrow_transaction_id) {
          const buyer = await User.findByPk(order.buyer_id, { attributes: ['email'] });
          if (buyer) {
            await confirmDeliveryEscrow(order.escrow_transaction_id, buyer.email).catch((e) => {
              console.error(`[Cron] Escrow confirmDelivery failed for order ${order.id}:`, e.response?.data || e.message);
            });
          }
        }

        await order.update({ status: 'COMPLETED' });
        await Transaction.create({
          order_id: order.id,
          escrow_transaction_id: order.escrow_transaction_id || null,
          escrow_event: 'auto_release',
          amount: order.total_amount,
          type: 'RELEASE',
          status: 'SUCCESS',
        });
        await notifyPaymentReleased(order.supplier_id, order.id, order.total_amount);
        if (io) {
          io.to(`user_${order.supplier_id}`).emit('payment_released', { orderId: order.id });
          io.to(`user_${order.buyer_id}`).emit('order_status_updated', { orderId: order.id, status: 'COMPLETED' });
        }
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
