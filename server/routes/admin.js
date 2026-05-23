const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getUsers, getAllListings, getAllOrders, getAllTransactions,
  getDisputes, resolveDispute, getAnalytics,
  getSupplierAnalytics, getBuyerAnalytics,
  toggleUserStatus, getUserActivity, verifyGST,
} = require('../controllers/adminController');

router.use(authenticate);

// Admin-only routes
router.get('/users', requireRole('admin'), getUsers);
router.patch('/users/:id/toggle-status', requireRole('admin'), toggleUserStatus);
router.patch('/users/:id/verify-gst', requireRole('admin'), verifyGST);
router.get('/users/:id/activity', requireRole('admin'), getUserActivity);
router.get('/listings', requireRole('admin'), getAllListings);
router.get('/orders', requireRole('admin'), getAllOrders);
router.get('/transactions', requireRole('admin'), getAllTransactions);
router.get('/disputes', requireRole('admin'), getDisputes);
router.post('/disputes/:id/resolve', requireRole('admin'), resolveDispute);
router.get('/analytics', requireRole('admin'), getAnalytics);

// Per-user analytics (own role)
router.get('/analytics/supplier', requireRole('supplier'), getSupplierAnalytics);
router.get('/analytics/buyer', requireRole('buyer'), getBuyerAnalytics);

module.exports = router;
