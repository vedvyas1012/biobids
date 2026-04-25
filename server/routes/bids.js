const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { acceptBid, rejectBid, getMyBids } = require('../controllers/bidController');

// GET  /api/bids/my           — buyer's own bids
// PUT  /api/bids/:id/accept   — supplier accepts a bid
// PUT  /api/bids/:id/reject   — supplier rejects a bid
router.get('/my', authenticate, requireRole('buyer'), getMyBids);
router.put('/:id/accept', authenticate, requireRole('supplier'), acceptBid);
router.put('/:id/reject', authenticate, requireRole('supplier'), rejectBid);

module.exports = router;
