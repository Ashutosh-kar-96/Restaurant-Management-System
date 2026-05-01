// controller
const svc = require('../service/billing.service');
const { successResponse } = require('../../../utils/response');

const generateBill   = async (req, res) => res.json(successResponse('Bill generated', await svc.generateBill(req.params.orderId)));
const processPayment = async (req, res) => res.status(201).json(successResponse('Payment processed', await svc.processPayment(req.body)));
const getInvoice     = async (req, res) => res.json(successResponse('Invoice fetched', await svc.getInvoice(req.params.id)));
const getPayments    = async (req, res) => res.json(successResponse('Payments fetched', await svc.getPayments(req.params.branchId, req.query)));

module.exports = { generateBill, processPayment, getInvoice, getPayments };
