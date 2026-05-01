// controller
const svc = require('../service/menu.service');
const { successResponse } = require('../../../utils/response');

const getCategories     = async (req, res) => res.json(successResponse('Categories fetched', await svc.getCategories(req.params.restaurantId)));
const createCategory    = async (req, res) => res.status(201).json(successResponse('Category created', await svc.createCategory(req.params.restaurantId, req.body)));
const updateCategory    = async (req, res) => res.json(successResponse('Category updated', await svc.updateCategory(req.params.id, req.body)));
const deleteCategory    = async (req, res) => res.json(successResponse('Category deleted', await svc.deleteCategory(req.params.id)));
const getItems          = async (req, res) => res.json(successResponse('Items fetched', await svc.getItems(req.params.restaurantId, req.query)));
const getItemById       = async (req, res) => res.json(successResponse('Item fetched', await svc.getItemById(req.params.id)));
const createItem        = async (req, res) => {
  const imagePath = req.file ? `/uploads/menu/${req.file.filename}` : null;
  if (req.body.variants && typeof req.body.variants === 'string') req.body.variants = JSON.parse(req.body.variants);
  res.status(201).json(successResponse('Item created', await svc.createItem(req.params.restaurantId, req.body, imagePath)));
};
const updateItem        = async (req, res) => {
  const imagePath = req.file ? `/uploads/menu/${req.file.filename}` : null;
  if (req.body.variants && typeof req.body.variants === 'string') req.body.variants = JSON.parse(req.body.variants);
  res.json(successResponse('Item updated', await svc.updateItem(req.params.id, req.body, imagePath)));
};
const deleteItem        = async (req, res) => res.json(successResponse('Item deleted', await svc.deleteItem(req.params.id)));
const toggleAvailability = async (req, res) => res.json(successResponse('Availability toggled', await svc.toggleAvailability(req.params.id)));

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, getItems, getItemById, createItem, updateItem, deleteItem, toggleAvailability };
