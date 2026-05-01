const router = require('express').Router();
const ctrl   = require('../controller/billing.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

router.get('/order/:orderId',       authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER','CASHIER'), ctrl.generateBill);
router.post('/pay',                 authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CASHIER'), ctrl.processPayment);
router.get('/invoice/:id',          ctrl.getInvoice);
router.get('/branch/:branchId',     authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CASHIER'), ctrl.getPayments);

module.exports = router;
