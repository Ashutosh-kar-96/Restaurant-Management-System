const { prisma }      = require('../../../config/database');
const { socketService } = require('../../../sockets');
const { AppError }    = require('../../../utils/AppError');

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Send a chat message (persisted to DB) ────────────────────────────────
const sendMessage = async ({
  fromUserId, fromRole, toRole, toUserId,
  restaurantId, branchId, title, message, type,
}) => {
  const record = await prisma.chatMessage.create({
    data: {
      fromUserId,
      fromRole,
      toRole,
      toUserId:     toUserId     || null,
      restaurantId: restaurantId || null,
      branchId:     branchId     || null,
      title:        title        || null,
      message,
      type:         type         || 'MESSAGE',
      isRead:       false,
      isPinned:     ['ADMIN_MESSAGE', 'SUPERADMIN_REPLY', 'MANAGER_MESSAGE', 'ADMIN_REPLY'].includes(type),
    },
    include: {
      from: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          restaurantStaff: {
            select: {
              branch: {
                select: {
                  id: true,
                  name: true,
                  restaurant: { select: { id: true, name: true } },
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  const branchName     = record.from.restaurantStaff?.[0]?.branch?.name || null;
  const branchIdResolved = record.from.restaurantStaff?.[0]?.branch?.id || branchId || null;
  const restaurantName = record.from.restaurantStaff?.[0]?.branch?.restaurant?.name || null;

  // Real-time emit
  const payload = {
    id:             record.id,
    type:           record.type,
    fromRole:       record.fromRole,
    fromUserId:     record.fromUserId,
    fromName:       `${record.from.firstName} ${record.from.lastName}`,
    branchName,
    branchId:       branchIdResolved,
    restaurantName,
    toRole:         record.toRole,
    toUserId:       record.toUserId,
    restaurantId:   record.restaurantId,
    message:        record.message,
    title:          record.title,
    isRead:         false,
    isPinned:       record.isPinned,
    createdAt:      record.createdAt.toISOString(),
  };

  if (toRole === 'RESTAURANT_ADMIN' && restaurantId) {
    socketService.emitToRestaurantAdmin(restaurantId, 'admin_notification', payload);
  } else if (toRole === 'SUPER_ADMIN') {
    socketService.emitToSuperAdmin('superadmin_notification', payload);
  } else if (toRole === 'MANAGER') {
    if (toUserId) {
      socketService.emitToUser(toUserId, 'manager_notification', payload);
    } else if (branchId) {
      socketService.emitToBranch(branchId, 'manager_notification', payload);
    }
  }

  return record;
};

// ─── Get messages for a user (inbox) ─────────────────────────────────────
const getMessages = async (userId, role, { restaurantId, branchId, page = 1, limit = 30 }) => {
  const take = parseInt(limit, 10) || 30;
  const skip = (parseInt(page, 10) - 1) * take;

  let where = {};

  if (role === 'MANAGER') {
    where = { toRole: 'MANAGER', branchId: branchId || undefined };
  } else if (role === 'RESTAURANT_ADMIN') {
    where = { toRole: 'RESTAURANT_ADMIN', restaurantId: restaurantId || undefined };
  } else if (role === 'SUPER_ADMIN') {
    where = { toRole: 'SUPER_ADMIN' };
  } else {
    return { messages: [], total: 0 };
  }

  const [messages, total] = await prisma.$transaction([
    prisma.chatMessage.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        from: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            restaurantStaff: {
              select: {
                branch: {
                  select: {
                    id: true,
                    name: true,
                    restaurant: { select: { id: true, name: true } },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.chatMessage.count({ where }),
  ]);

  // Attach branchName and restaurantName to each message
  const enriched = messages.map((m) => ({
    ...m,
    fromName:       `${m.from.firstName} ${m.from.lastName}`,
    branchName:     m.from.restaurantStaff?.[0]?.branch?.name     || null,
    branchId:       m.from.restaurantStaff?.[0]?.branch?.id       || m.branchId || null,
    restaurantName: m.from.restaurantStaff?.[0]?.branch?.restaurant?.name || null,
  }));

  return { messages: enriched, total, page: parseInt(page, 10), pages: Math.ceil(total / take) };
};

// ─── Get sent messages (outbox) ───────────────────────────────────────────
const getSentMessages = async (userId, { page = 1, limit = 30 }) => {
  const take = parseInt(limit, 10) || 30;
  const skip = (parseInt(page, 10) - 1) * take;
  const where = { fromUserId: userId };

  const [messages, total] = await prisma.$transaction([
    prisma.chatMessage.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        from: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.chatMessage.count({ where }),
  ]);

  return { messages, total, page: parseInt(page, 10), pages: Math.ceil(total / take) };
};

// ─── Mark message as read ─────────────────────────────────────────────────
const markRead = async (messageId, userId) => {
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!msg) throw new AppError('Message not found', 404);
  return prisma.chatMessage.update({
    where: { id: messageId },
    data:  { isRead: true, isPinned: false },
  });
};

// ─── Mark all read ────────────────────────────────────────────────────────
const markAllRead = async (userId, role, { restaurantId, branchId }) => {
  let where = {};
  if (role === 'MANAGER')               where = { toRole: 'MANAGER',           branchId:     branchId     || undefined };
  else if (role === 'RESTAURANT_ADMIN') where = { toRole: 'RESTAURANT_ADMIN',  restaurantId: restaurantId || undefined };
  else if (role === 'SUPER_ADMIN')      where = { toRole: 'SUPER_ADMIN' };
  await prisma.chatMessage.updateMany({ where: { ...where, isRead: false }, data: { isRead: true, isPinned: false } });
  return { success: true };
};

// ─── Get unread count ─────────────────────────────────────────────────────
const getUnreadCount = async (role, { restaurantId, branchId }) => {
  let where = { isRead: false };
  if (role === 'MANAGER')               { where.toRole = 'MANAGER';           where.branchId     = branchId     || undefined; }
  else if (role === 'RESTAURANT_ADMIN') { where.toRole = 'RESTAURANT_ADMIN';  where.restaurantId = restaurantId || undefined; }
  else if (role === 'SUPER_ADMIN')      { where.toRole = 'SUPER_ADMIN'; }
  const count = await prisma.chatMessage.count({ where });
  return { count };
};

module.exports = { sendMessage, getMessages, getSentMessages, markRead, markAllRead, getUnreadCount };