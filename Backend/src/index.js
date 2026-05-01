require('dotenv').config();
require('express-async-errors');

const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const { rateLimit } = require('express-rate-limit');
const path        = require('path');

const { initializeSocket } = require('./sockets');
const { logger }           = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { prisma }           = require('./config/database');

// ── Routes
const authRoutes       = require('./modules/auth/routes/auth.routes');
const restaurantRoutes = require('./modules/restaurant/routes/restaurant.routes');
const menuRoutes       = require('./modules/menu/routes/menu.routes');
const orderRoutes      = require('./modules/order/routes/order.routes');
const tableRoutes      = require('./modules/table/routes/table.routes');
const kitchenRoutes    = require('./modules/kitchen/routes/kitchen.routes');
const billingRoutes    = require('./modules/billing/routes/billing.routes');
const inventoryRoutes  = require('./modules/inventory/routes/inventory.routes');
const analyticsRoutes  = require('./modules/analytics/routes/analytics.routes');
const notificationRoutes = require('./modules/notification/routes/notification.routes');

const app    = express();
const server = http.createServer(app);

// ── Security Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile, curl, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID', 'X-Branch-ID'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Static files
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// ── Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
  });
});

// ── API Routes
app.use('/api/auth',          authRoutes);
app.use('/api/restaurants',  restaurantRoutes);
app.use('/api/menus',        menuRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/tables',       tableRoutes);
app.use('/api/kitchen',      kitchenRoutes);
app.use('/api/billing',      billingRoutes);
app.use('/api/inventory',    inventoryRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Socket.io
initializeSocket(server);

// ── Error Handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// ── Boot
const PORT = process.env.PORT || 9001;

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ MySQL database connected');
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 RMS Server running → http://localhost:${PORT}`);
      logger.info(`📡 WebSocket ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    });
  } catch (err) {
    logger.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

bootstrap();
