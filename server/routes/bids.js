const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { placeBid, getBids, acceptBid, rejectBid, getMyBids } = require('../controllers/bidController');

router.use(authenticate);
router.get('/my', requireRole('buyer'), getMyBids);
router.post('/listings/:id/bids', requireRole('buyer'), placeBid);
router.get('/listings/:id/bids', getBids);
router.put('/:id/accept', requireRole('supplier'), acceptBid);
router.put('/:id/reject', requireRole('supplier'), rejectBid);

module.exports = router;
