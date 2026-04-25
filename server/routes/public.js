const router = require('express').Router();
const { User, Listing, Order } = require('../models');

// Simple in-process cache — refreshed every 60 s so the landing page never hits DB on every pageview
let statsCache = null;
let statsCacheAt = 0;
const CACHE_TTL_MS = 60_000;

// GET /api/public/stats — unauthenticated platform stats for Landing page
router.get('/stats', async (req, res) => {
  // Serve from cache if still fresh
  if (statsCache && Date.now() - statsCacheAt < CACHE_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(statsCache);
  }

  try {
    const [suppliers, buyers, tonnesTraded, states] = await Promise.all([
      User.count({ where: { role: 'supplier' } }),
      User.count({ where: { role: 'buyer' } }),
      // Order.sum() is a single SQL SUM() — much cheaper than findAll + JS reduce
      Order.sum('quantity', { where: { status: 'COMPLETED' } }).then((v) => Math.round(v || 0)),
      Listing.count({ distinct: true, col: 'location_state' }),
    ]);

    statsCache = { suppliers, buyers, tonnesTraded, states };
    statsCacheAt = Date.now();

    res.set('Cache-Control', 'public, max-age=60');
    res.json(statsCache);
  } catch (err) {
    console.error('[Public] /stats error:', err.message);
    res.json({ suppliers: 0, buyers: 0, tonnesTraded: 0, states: 0 });
  }
});

module.exports = router;
