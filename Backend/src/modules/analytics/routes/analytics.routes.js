const router = require('express').Router();
const ctrl   = require('../controller/analytics.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

const mgmt = ['SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'];

router.get('/dashboard/:branchId',   authorize(...mgmt), ctrl.getDashboard);
router.get('/revenue/:branchId',     authorize(...mgmt), ctrl.getRevenue);
router.get('/staff/:branchId',       authorize(...mgmt), ctrl.getStaffPerformance);
router.get('/inventory/:branchId',   authorize(...mgmt), ctrl.getInventoryReport);

// Super Admin: platform-wide revenue across all branches/restaurants
router.get('/platform/revenue', authorize('SUPER_ADMIN'), ctrl.getPlatformRevenue);

module.exports = router;
