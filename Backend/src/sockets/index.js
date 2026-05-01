const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const { logger } = require('../config/logger');

let io = null;

// ─── In-memory registry: userId → Set of socketIds ────────────────────────
const userSockets = new Map();   // userId  → Set<socketId>
const socketMeta  = new Map();   // socketId → { userId, role, branchId, restaurantId }

// ─── Room helpers ──────────────────────────────────────────────────────────
//  branch:{branchId}                   → everyone in that branch
//  kitchen:{branchId}                  → chefs in that branch
//  waiter:{branchId}:{userId}          → a specific waiter
//  role:{branchId}:MANAGER             → all managers in branch
//  role:{branchId}:CASHIER             → all cashiers in branch
//  restaurant:{restaurantId}:ADMIN     → restaurant admins
//  global:SUPER_ADMIN                  → super admins
const rooms = {
  branch:        (bId)           => `branch:${bId}`,
  kitchen:       (bId)           => `kitchen:${bId}`,
  waiter:        (bId, uId)      => `waiter:${bId}:${uId}`,
  role:          (bId, role)     => `role:${bId}:${role}`,
  restaurantAdmin:(rId)          => `restaurant:${rId}:ADMIN`,
  superAdmin:    ()              => `global:SUPER_ADMIN`,
};

// ─── Socket Service (used by order/kitchen/billing services) ──────────────
const socketService = {
  // New order → chefs + managers in that branch
  emitToKitchen(branchId, event, data) {
    if (!io) return;
    io.to(rooms.kitchen(branchId)).emit(event, data);
    io.to(rooms.role(branchId, 'MANAGER')).emit(event, data);
  },

  // Branch-wide (cashier, manager see order_created etc.)
  emitToBranch(branchId, event, data) {
    if (!io) return;
    io.to(rooms.branch(branchId)).emit(event, data);
  },

  // Status updates → the specific waiter who owns the order
  emitToWaiter(branchId, waiterId, event, data) {
    if (!io) return;
    io.to(rooms.waiter(branchId, waiterId)).emit(event, data);
    // Manager always sees everything
    io.to(rooms.role(branchId, 'MANAGER')).emit(event, data);
  },

  // Specific user by userId
  emitToUser(userId, event, data) {
    if (!io) return;
    const sids = userSockets.get(userId);
    if (sids) sids.forEach((sid) => io.to(sid).emit(event, data));
  },

  // Restaurant admin (for manager→admin messages)
  emitToRestaurantAdmin(restaurantId, event, data) {
    if (!io) return;
    io.to(rooms.restaurantAdmin(restaurantId)).emit(event, data);
  },

  // Super admin (for admin→superadmin messages)
  emitToSuperAdmin(event, data) {
    if (!io) return;
    io.to(rooms.superAdmin()).emit(event, data);
  },
};

// ─── Initialize ───────────────────────────────────────────────────────────
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware ──────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = payload;   // { userId, role, branchId, restaurantId }
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role, branchId, restaurantId } = socket.data.user;
    logger.info(`Socket connected: ${socket.id} | ${role} | branch:${branchId}`);

    // Register in maps
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socketMeta.set(socket.id, { userId, role, branchId, restaurantId });

    // ── Join rooms based on role ─────────────────────────────────────────
    if (branchId) {
      socket.join(rooms.branch(branchId));

      switch (role) {
        case 'CHEF':
          socket.join(rooms.kitchen(branchId));
          break;
        case 'WAITER':
          socket.join(rooms.waiter(branchId, userId));
          socket.join(rooms.role(branchId, 'WAITER'));
          break;
        case 'CASHIER':
          socket.join(rooms.role(branchId, 'CASHIER'));
          break;
        case 'MANAGER':
          socket.join(rooms.role(branchId, 'MANAGER'));
          break;
        default:
          break;
      }
    }

    if (role === 'RESTAURANT_ADMIN' && restaurantId) {
      socket.join(rooms.restaurantAdmin(restaurantId));
    }

    if (role === 'SUPER_ADMIN') {
      socket.join(rooms.superAdmin());
    }

    // ── Manager → Restaurant Admin message ──────────────────────────────
    // Payload: { message, fromName, fromBranchId, restaurantId }
    socket.on('manager_to_admin', (data) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'MANAGER') return;
      const rId = data.restaurantId || restaurantId;
      if (!rId) return;
      const payload = {
        id:           `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type:         'MANAGER_MESSAGE',
        fromRole:     'MANAGER',
        fromUserId:   userId,
        fromName:     data.fromName || 'Manager',
        branchId:     meta.branchId,
        branchName:   data.branchName || null,
        restaurantId: rId,
        message:      data.message,
        createdAt:    new Date().toISOString(),
        isRead:       false,
      };
      io.to(rooms.restaurantAdmin(rId)).emit('admin_notification', payload);
      // echo back to manager as confirmation
      socket.emit('message_sent', { ...payload, echo: true });
      logger.info(`Manager→Admin message from ${userId} to restaurant ${rId}`);
    });

    // ── Restaurant Admin → Manager reply ────────────────────────────────
    // Payload: { message, toManagerId, branchId, restaurantId }
    socket.on('admin_to_manager', (data) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'RESTAURANT_ADMIN') return;
      const payload = {
        id:         `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type:       'ADMIN_REPLY',
        fromRole:   'RESTAURANT_ADMIN',
        fromUserId: userId,
        fromName:   data.fromName || 'Restaurant Admin',
        message:    data.message,
        createdAt:  new Date().toISOString(),
        isRead:     false,
      };
      if (data.toManagerId) {
        // Reply to specific manager
        socketService.emitToUser(data.toManagerId, 'manager_notification', payload);
      } else if (data.branchId) {
        // Broadcast to all managers in branch
        io.to(rooms.role(data.branchId, 'MANAGER')).emit('manager_notification', payload);
      }
      socket.emit('message_sent', { ...payload, echo: true });
      logger.info(`Admin→Manager reply from ${userId}`);
    });

    // ── Restaurant Admin → Super Admin message ───────────────────────────
    // Payload: { message, fromName, restaurantId, restaurantName }
    socket.on('admin_to_superadmin', (data) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'RESTAURANT_ADMIN') return;
      const payload = {
        id:             `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type:           'ADMIN_MESSAGE',
        fromRole:       'RESTAURANT_ADMIN',
        fromUserId:     userId,
        fromName:       data.fromName || 'Restaurant Admin',
        restaurantId:   restaurantId,
        restaurantName: data.restaurantName || null,
        message:        data.message,
        createdAt:      new Date().toISOString(),
        isRead:         false,
      };
      io.to(rooms.superAdmin()).emit('superadmin_notification', payload);
      socket.emit('message_sent', { ...payload, echo: true });
      logger.info(`Admin→SuperAdmin message from ${userId}`);
    });

    // ── Super Admin → Restaurant Admin reply ────────────────────────────
    // Payload: { message, toRestaurantId, fromName }
    socket.on('superadmin_to_admin', (data) => {
      const meta = socketMeta.get(socket.id);
      if (!meta || meta.role !== 'SUPER_ADMIN') return;
      if (!data.toRestaurantId) return;
      const payload = {
        id:         `msg-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type:       'SUPERADMIN_REPLY',
        fromRole:   'SUPER_ADMIN',
        fromUserId: userId,
        fromName:   data.fromName || 'Super Admin',
        message:    data.message,
        createdAt:  new Date().toISOString(),
        isRead:     false,
      };
      io.to(rooms.restaurantAdmin(data.toRestaurantId)).emit('admin_notification', payload);
      socket.emit('message_sent', { ...payload, echo: true });
      logger.info(`SuperAdmin→Admin reply from ${userId} to restaurant ${data.toRestaurantId}`);
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sids = userSockets.get(userId);
      if (sids) {
        sids.delete(socket.id);
        if (sids.size === 0) userSockets.delete(userId);
      }
      socketMeta.delete(socket.id);
      logger.info(`Socket disconnected: ${socket.id} | ${role}`);
    });
  });

  logger.info('📡 Socket.io initialized with role-based rooms');
  return io;
};

module.exports = { initializeSocket, socketService };
