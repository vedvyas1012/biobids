const router = require('express').Router();
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');
const { placeBid, getBids } = require('../controllers/bidController');

// POST /api/listings/:id/bids  — place a bid (buyer only)
// GET  /api/listings/:id/bids  — view bids (public, user optionally attached)
router.post('/:id/bids', authenticate, requireRole('buyer'), placeBid);
router.get('/:id/bids', optionalAuth, getBids);

module.exports = router;
