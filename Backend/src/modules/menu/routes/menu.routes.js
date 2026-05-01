const router = require('express').Router();
const ctrl   = require('../controller/menu.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { upload } = require('../../../middleware/upload.middleware');

const mgmt = ['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'];

router.use(authenticate);

// Categories
router.get('/:restaurantId/categories',    ctrl.getCategories);
router.post('/:restaurantId/categories',   authorize(...mgmt), ctrl.createCategory);
router.put('/categories/:id',              authorize(...mgmt), ctrl.updateCategory);
router.delete('/categories/:id',           authorize(...mgmt), ctrl.deleteCategory);

// Items
router.get('/:restaurantId/items',         ctrl.getItems);
router.get('/items/:id',                   ctrl.getItemById);
router.post('/:restaurantId/items',        authorize(...mgmt), upload.single('image'), ctrl.createItem);
router.put('/items/:id',                   authorize(...mgmt), upload.single('image'), ctrl.updateItem);
router.delete('/items/:id',                authorize(...mgmt), ctrl.deleteItem);
router.patch('/items/:id/toggle',          authorize(...mgmt), ctrl.toggleAvailability);

module.exports = router;
