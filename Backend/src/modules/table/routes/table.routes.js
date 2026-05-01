const router = require('express').Router();
const ctrl   = require('../controller/table.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');

router.use(authenticate);

router.get('/branch/:branchId',                  ctrl.getTables);
router.post('/branch/:branchId',                 authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'), ctrl.createTable);
router.get('/:id',                               ctrl.getTable);
router.put('/:id',                               authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'), ctrl.updateTable);
router.delete('/:id',                            authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'), ctrl.deleteTable);
router.patch('/:id/status',                      authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER'), ctrl.updateStatus);
router.post('/:id/qr/:branchId',                 authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER'), ctrl.regenerateQR);
router.get('/bookings/branch/:branchId',         ctrl.getBookings);
router.post('/bookings',                         ctrl.createBooking);
router.patch('/bookings/:id',                    authorize('SUPER_ADMIN','RESTAURANT_ADMIN','MANAGER','WAITER'), ctrl.updateBooking);

module.exports = router;
