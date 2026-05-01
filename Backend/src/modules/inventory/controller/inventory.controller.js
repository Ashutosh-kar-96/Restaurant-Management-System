// controller
const svc = require('../service/inventory.service');
const { successResponse } = require('../../../utils/response');

const getAll         = async (req, res) => res.json(successResponse('Inventory fetched', await svc.getAll(req.params.branchId)));
const getById        = async (req, res) => res.json(successResponse('Item fetched', await svc.getById(req.params.id)));
const create         = async (req, res) => res.status(201).json(successResponse('Item created', await svc.create(req.params.branchId, req.body)));
const update         = async (req, res) => res.json(successResponse('Item updated', await svc.update(req.params.id, req.body)));
const restock        = async (req, res) => res.json(successResponse('Restocked', await svc.restock(req.params.id, req.body)));
const getLowStock    = async (req, res) => res.json(successResponse('Low stock fetched', await svc.getLowStock(req.params.branchId)));
const getSuppliers   = async (req, res) => res.json(successResponse('Suppliers fetched', await svc.getSuppliers()));
const createSupplier = async (req, res) => res.status(201).json(successResponse('Supplier created', await svc.createSupplier(req.body)));

module.exports = { getAll, getById, create, update, restock, getLowStock, getSuppliers, createSupplier };
