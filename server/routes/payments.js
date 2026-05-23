const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { initiatePayment, getPaymentStatus, handleWebhook, getTransactions, verifyDeposit, withdrawBid } = require('../controllers/paymentController');

// Webhook must be unauthenticated (Escrow.com posts directly)
router.post('/webhook', handleWebhook);

router.use(authenticate);
router.post('/initiate/:order_id', requireRole('buyer'), initiatePayment);
router.get('/status/:order_id', getPaymentStatus);
router.get('/transactions', getTransactions);

// Razorpay bid security deposit
router.post('/verify-deposit', requireRole('buyer'), verifyDeposit);
router.post('/withdraw-bid/:bid_id', requireRole('buyer'), withdrawBid);

module.exports = router;
