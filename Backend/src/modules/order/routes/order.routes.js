const router = require('express').Router();
const ctrl   = require('../controller/order.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

router.post('/', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER','CUSTOMER'), ctrl.createOrder);
router.get('/branch/:branchId',  authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER','CHEF','CASHIER'), ctrl.getOrders);
router.get('/kitchen/:branchId', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CHEF'), ctrl.getKitchenOrders);
router.get('/:id',               ctrl.getOrder);
router.patch('/:id/status',      authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER','CHEF'), ctrl.updateStatus);
router.patch('/:orderId/items/:itemId/prepared', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CHEF'), ctrl.markItemPrepared);
router.patch('/:id/cancel',      authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'), ctrl.cancelOrder);

module.exports = router;
