const router = require('express').Router();
const ctrl   = require('../controller/restaurant.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

router.get('/',    authorize('SUPER_ADMIN'), ctrl.getAll);
router.post('/',   authorize('SUPER_ADMIN'), ctrl.create);
router.get('/:id',    ctrl.getById);
router.put('/:id',    authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.update);
router.delete('/:id', authorize('SUPER_ADMIN'), ctrl.remove);

// Branches
router.get('/:id/branches',              ctrl.getBranches);
router.post('/:id/branches',             authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.createBranch);
router.put('/:id/branches/:branchId',    authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'), ctrl.updateBranch);
router.delete('/:id/branches/:branchId', authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.deleteBranch);

// Staff
router.get('/:id/staff',              authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'), ctrl.getStaff);
router.post('/:id/staff',             authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.addStaff);
router.patch('/:id/staff/:userId/role', authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.updateStaffRole);
router.delete('/:id/staff/:userId',   authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN'), ctrl.removeStaff);

module.exports = router;
