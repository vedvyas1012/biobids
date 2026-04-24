const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { initiatePayment, getPaymentStatus, handleWebhook, getTransactions } = require('../controllers/paymentController');

// Webhook must be unauthenticated (Escrow.com posts directly)
router.post('/webhook', handleWebhook);

router.use(authenticate);
router.post('/initiate/:order_id', requireRole('buyer'), initiatePayment);
router.get('/status/:order_id', getPaymentStatus);
router.get('/transactions', getTransactions);

module.exports = router;
