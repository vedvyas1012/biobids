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
        // Isolate each order in its own try/catch so one failure doesn't abort the rest
        try {
          // Notify Escrow.com that buyer implicitly accepted (auto-release).
          // Track whether Escrow confirmed — only mark COMPLETED if it did.
          let escrowOk = true; // assume OK when no escrow ID (orders without escrow skip the API call)

          if (order.escrow_transaction_id) {
            const buyer = await User.findByPk(order.buyer_id, { attributes: ['email'] });
            if (buyer) {
              try {
                await confirmDeliveryEscrow(order.escrow_transaction_id, buyer.email);
              } catch (e) {
                escrowOk = false;
                console.error(`[Cron] Escrow confirmDelivery failed for order ${order.id}:`, e.response?.data || e.message);
              }
            }
          }

          if (escrowOk) {
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
          } else {
            // Escrow call failed — record as pending and leave order IN_TRANSIT for next run
            await Transaction.create({
              order_id: order.id,
              escrow_transaction_id: order.escrow_transaction_id || null,
              escrow_event: 'auto_release_pending',
              amount: order.total_amount,
              type: 'RELEASE',
              status: 'PENDING',
            }).catch((e) => console.warn(`[Cron] Could not record pending txn for order ${order.id} (may be duplicate):`, e.message));
            console.warn(`[Cron] Order ${order.id} kept IN_TRANSIT — Escrow confirmation pending`);
          }
        } catch (orderErr) {
          // Log and continue — remaining overdue orders must still be processed
          console.error(`[Cron] Failed to auto-release order ${order.id}:`, orderErr.message);
        }
      }
    } catch (err) {
      console.error('[Cron] Escrow auto-release error:', err.message);
    }
  });

  // Expire bids older than 48 hours; refund deposit if paid
  cron.schedule('0 * * * *', async () => {
    try {
      const { Bid } = require('../models');
      const { refundPayment } = require('./razorpayService');

      const expiredBids = await Bid.findAll({
        where: { status: 'PENDING', expires_at: { [Op.lte]: new Date() } },
      });

      for (const bid of expiredBids) {
        await bid.update({ status: 'EXPIRED' });
        if (bid.deposit_payment_id && bid.deposit_status === 'PAID') {
          refundPayment(bid.deposit_payment_id, 'bid_expired')
            .then(() => bid.update({ deposit_status: 'REFUNDED' }))
            .catch((e) => console.error(`[Cron] Deposit refund failed for expired bid ${bid.id}:`, e.message));
        }
      }
      if (expiredBids.length > 0) console.log(`[Cron] Expired ${expiredBids.length} bids`);
    } catch (err) {
      console.error('[Cron] Bid expiry error:', err.message);
    }
  });

  // Forfeit deposit when buyer wins bid but doesn't pay Escrow within 72 hours
  cron.schedule('0 * * * *', async () => {
    try {
      const { Bid } = require('../models');
      const { refundPayment } = require('./razorpayService');
      const deadline = new Date(Date.now() - 72 * 60 * 60 * 1000);

      const stalledOrders = await Order.findAll({
        where: {
          status:     'AWAITING_PAYMENT',
          created_at: { [Op.lte]: deadline },
        },
        include: [{ model: Bid, as: 'bid' }],
      });

      for (const order of stalledOrders) {
        try {
          await order.update({ status: 'CANCELLED' });
          const bid = order.bid;
          if (bid && bid.deposit_payment_id && bid.deposit_status === 'PAID') {
            // Forfeit — do NOT refund
            await bid.update({ deposit_status: 'FORFEITED' });
            console.log(`[Cron] Deposit FORFEITED for bid ${bid.id} (order ${order.id} unpaid for 72h)`);
          }
          if (io) {
            io.to(`user_${order.buyer_id}`).emit('order_status_updated', { orderId: order.id, status: 'CANCELLED' });
          }
        } catch (e) {
          console.error(`[Cron] Deposit forfeit failed for order ${order.id}:`, e.message);
        }
      }
    } catch (err) {
      console.error('[Cron] Deposit forfeit cron error:', err.message);
    }
  });
};

module.exports = { startEscrowCron, setIo };
