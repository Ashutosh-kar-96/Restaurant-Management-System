const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Forbidden: Insufficient permissions', 403));
  }
  next();
};

const requireRestaurantAccess = (req, res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401));
  if (req.user.role === 'SUPER_ADMIN') return next();
  const restaurantId = req.params.restaurantId || req.headers['x-restaurant-id'];
  if (!restaurantId) return next(new AppError('Restaurant ID required', 400));
  if (req.user.restaurantId !== restaurantId) {
    return next(new AppError('Access denied to this restaurant', 403));
  }
  next();
};

module.exports = { authenticate, authorize, requireRestaurantAccess };
