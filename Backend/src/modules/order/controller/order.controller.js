// controller
const svc = require('../service/order.service');
const { successResponse } = require('../../../utils/response');

const createOrder       = async (req, res) => {
  const data = { ...req.body };
  if (req.user.role === 'WAITER')    data.waiterId   = req.user.userId;
  if (req.user.role === 'CUSTOMER')  data.customerId = req.user.userId;
  res.status(201).json(successResponse('Order created', await svc.createOrder(data)));
};
const getOrders         = async (req, res) => res.json(successResponse('Orders fetched', await svc.getOrders(req.params.branchId, req.query)));
const getKitchenOrders  = async (req, res) => res.json(successResponse('Kitchen orders fetched', await svc.getKitchenOrders(req.params.branchId)));
const getOrder          = async (req, res) => res.json(successResponse('Order fetched', await svc.getOrderById(req.params.id)));
const updateStatus      = async (req, res) => res.json(successResponse('Status updated', await svc.updateOrderStatus(req.params.id, req.body)));
const markItemPrepared  = async (req, res) => res.json(successResponse('Item prepared', await svc.markItemPrepared(req.params.orderId, req.params.itemId)));
const cancelOrder       = async (req, res) => res.json(successResponse('Order cancelled', await svc.cancelOrder(req.params.id, req.body.reason)));

module.exports = { createOrder, getOrders, getKitchenOrders, getOrder, updateStatus, markItemPrepared, cancelOrder };
