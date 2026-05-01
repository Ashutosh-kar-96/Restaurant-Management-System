// inventory.routes.js
const router = require('express').Router();
const ctrl   = require('../controller/inventory.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

const mgmt = ['SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'];

router.get('/branch/:branchId',          authorize(...mgmt), ctrl.getAll);
router.post('/branch/:branchId',         authorize(...mgmt), ctrl.create);
router.get('/low-stock/:branchId',       authorize(...mgmt,'CHEF'), ctrl.getLowStock);
router.get('/suppliers',                 authorize(...mgmt), ctrl.getSuppliers);
router.post('/suppliers',                authorize(...mgmt), ctrl.createSupplier);
router.get('/:id',                       authorize(...mgmt), ctrl.getById);
router.put('/:id',                       authorize(...mgmt), ctrl.update);
router.post('/:id/restock',              authorize(...mgmt), ctrl.restock);

module.exports = router;
