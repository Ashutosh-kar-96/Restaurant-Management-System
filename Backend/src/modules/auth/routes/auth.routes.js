const router = require('express').Router();
const ctrl   = require('../controller/auth.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const { body }     = require('express-validator');

const registerValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name required'),
  body('lastName').notEmpty().trim().withMessage('Last name required'),
];
const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', validate(registerValidators), ctrl.register);
router.post('/login',    validate(loginValidators),    ctrl.login);
router.post('/refresh',  ctrl.refreshToken);

router.use(authenticate);
router.post('/logout',           ctrl.logout);
router.get('/profile',           ctrl.getProfile);
router.patch('/profile',         ctrl.updateProfile);
router.patch('/change-password', ctrl.changePassword);

// IMPORTANT: /users/search MUST be declared before /users/:id/toggle
// Otherwise Express matches "search" as the :id parameter
router.get('/users/search',         authorize('SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'), ctrl.searchUsers);
router.get('/users',                authorize('SUPER_ADMIN'), ctrl.getAllUsers);
router.patch('/users/:id/toggle',   authorize('SUPER_ADMIN'), ctrl.toggleUserStatus);

module.exports = router;
