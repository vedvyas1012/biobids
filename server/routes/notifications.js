const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, markRead, markAllRead } = require('../controllers/notificationController');

router.use(authenticate);
router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);

module.exports = router;
