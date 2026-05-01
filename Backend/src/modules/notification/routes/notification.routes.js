const router = require('express').Router();
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const ctrl = require('../controller/notification.controller');

const CHAT_ROLES = ['MANAGER', 'RESTAURANT_ADMIN', 'SUPER_ADMIN'];

router.use(authenticate);

// Send a message (manager→admin, admin→superadmin, admin→manager, superadmin→admin)
router.post('/', authorize(...CHAT_ROLES), ctrl.send);

// Inbox (messages addressed to this role)
router.get('/inbox', authorize(...CHAT_ROLES), ctrl.inbox);

// Outbox (messages sent by this user)
router.get('/outbox', authorize(...CHAT_ROLES), ctrl.outbox);

// Unread count
router.get('/unread-count', authorize(...CHAT_ROLES), ctrl.unreadCount);

// Mark single message read
router.patch('/:id/read', authorize(...CHAT_ROLES), ctrl.markRead);

// Mark all read
router.patch('/mark-all-read', authorize(...CHAT_ROLES), ctrl.markAllRead);

module.exports = router;
