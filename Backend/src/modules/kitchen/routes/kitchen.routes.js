const router = require('express').Router();
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const orderSvc = require('../../../modules/order/service/order.service');
const { successResponse } = require('../../../utils/response');

router.use(authenticate);

router.get('/:branchId', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CHEF'), async (req, res) => {
  const orders = await orderSvc.getKitchenOrders(req.params.branchId);
  res.json(successResponse('Kitchen orders fetched', orders));
});

router.patch('/:orderId/items/:itemId/prepared', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CHEF'), async (req, res) => {
  const item = await orderSvc.markItemPrepared(req.params.orderId, req.params.itemId);
  res.json(successResponse('Item marked prepared', item));
});

router.patch('/:orderId/status', authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','CHEF'), async (req, res) => {
  const order = await orderSvc.updateOrderStatus(req.params.orderId, req.body);
  res.json(successResponse('Order status updated', order));
});

module.exports = router;
