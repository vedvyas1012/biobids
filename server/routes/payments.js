const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { createPaymentOrder, verifyPayment, releasePayment, getTransactions } = require('../controllers/paymentController');

router.use(authenticate);
router.post('/create-order', requireRole('buyer'), createPaymentOrder);
router.post('/verify', requireRole('buyer'), verifyPayment);
router.post('/release/:order_id', requireRole('admin'), releasePayment);
router.get('/transactions', getTransactions);

module.exports = router;
