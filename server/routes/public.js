const router = require('express').Router();
const { User, Listing, Order } = require('../models');

// GET /api/public/stats — unauthenticated platform stats for Landing page
router.get('/stats', async (req, res) => {
  try {
    const [suppliers, buyers, completedOrders, states] = await Promise.all([
      User.count({ where: { role: 'supplier' } }),
      User.count({ where: { role: 'buyer' } }),
      Order.findAll({ where: { status: 'COMPLETED' }, attributes: ['quantity'] }),
      Listing.count({ distinct: true, col: 'location_state' }),
    ]);
    const tonnesTraded = completedOrders.reduce((s, o) => s + parseFloat(o.quantity), 0);
    res.json({ suppliers, buyers, tonnesTraded: Math.round(tonnesTraded), states });
  } catch (err) {
    console.error('[Public] /stats error:', err.message);
    res.json({ suppliers: 0, buyers: 0, tonnesTraded: 0, states: 0 });
  }
});

module.exports = router;
