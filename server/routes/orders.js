const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getOrders, getOrderById, dispatchOrder, confirmDelivery, raiseDispute } = require('../controllers/orderController');

router.use(authenticate);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/:id/dispatch', requireRole('supplier'), (req, res, next) => {
  req.uploadDir = 'dispatch'; next();
}, upload.single('proof'), dispatchOrder);
router.post('/:id/confirm-delivery', requireRole('buyer'), confirmDelivery);
router.post('/:id/dispute', requireRole('buyer'), (req, res, next) => {
  req.uploadDir = 'disputes'; next();
}, upload.single('evidence'), raiseDispute);

module.exports = router;
