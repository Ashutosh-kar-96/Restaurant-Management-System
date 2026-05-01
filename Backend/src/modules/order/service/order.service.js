const { prisma } = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');
const { generateOrderNumber } = require('../../../utils/helpers');
const { socketService } = require('../../../sockets');

const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
  SERVED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const validateTransition = (current, next) => {
  if (!STATUS_TRANSITIONS[current]?.includes(next))
    throw new AppError(`Cannot move order from ${current} to ${next}`, 400);
};

const calcEstimatedTime = async (branchId, items) => {
  const ids = items.map((i) => i.menuItemId);
  const dbItems = await prisma.menuItem.findMany({ where: { id: { in: ids } }, select: { preparationTime: true } });
  const maxPrep = Math.max(...dbItems.map((m) => m.preparationTime || 15), 15);
  const active = await prisma.order.count({ where: { branchId, status: { in: ['CONFIRMED', 'PREPARING'] } } });
  return maxPrep + Math.floor(active / 3) * 5;
};

const createOrder = async ({ branchId, tableId, customerId, waiterId, orderType, items, specialInstructions }) => {
  if (!items?.length) throw new AppError('Order must have at least one item', 400);
  if (!branchId) throw new AppError('Branch ID is required', 400);

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isAvailable: true },
    include: { variants: true },
  });

  if (menuItems.length !== menuItemIds.length)
    throw new AppError('One or more menu items are unavailable or not found', 400);

  let subtotal = 0;
  let taxAmount = 0;

  const orderItemsData = items.map((item) => {
    const mi = menuItems.find((m) => m.id === item.menuItemId);
    let unitPrice = parseFloat(mi.basePrice);
    if (item.variantId) {
      const variant = mi.variants.find((v) => v.id === item.variantId);
      if (variant) unitPrice = parseFloat(variant.price);
    }
    const itemSub = unitPrice * item.quantity;
    const itemTax = itemSub * (parseFloat(mi.taxRate) / 100);
    subtotal += itemSub;
    taxAmount += itemTax;
    return {
      menuItemId: item.menuItemId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      unitPrice,
      taxRate: parseFloat(mi.taxRate),
      totalPrice: itemSub + itemTax,
      notes: item.notes || null,
    };
  });

  const totalAmount = subtotal + taxAmount;
  const estimatedTime = await calcEstimatedTime(branchId, items);

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        branchId,
        tableId: tableId || null,
        customerId: customerId || null,
        waiterId: waiterId || null,
        orderType: orderType || 'DINE_IN',
        status: 'PENDING',
        specialInstructions: specialInstructions || null,
        subtotal, taxAmount, totalAmount, estimatedTime,
        items: { create: orderItemsData },
        statusHistory: { create: { status: 'PENDING', note: 'Order placed' } },
      },
      include: {
        items: { include: { menuItem: true, variant: true } },
        table: true,
        customer: { select: { id: true, firstName: true, lastName: true } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (tableId && (orderType === 'DINE_IN' || !orderType)) {
      await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
    }
    return newOrder;
  });

  // new_order → only chefs (kitchen) + managers see this with full order details + waiter name
  socketService.emitToKitchen(branchId, 'new_order', {
    ...order,
    waiterName: order.waiter ? `${order.waiter.firstName} ${order.waiter.lastName}` : null,
  });
  // order_created → branch-wide (cashier counts, manager dashboard)
  socketService.emitToBranch(branchId, 'order_created', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    tableNumber: order.table?.number || null,
    waiterName: order.waiter ? `${order.waiter.firstName} ${order.waiter.lastName}` : null,
    waiterId: order.waiterId || null,
    totalAmount: order.totalAmount,
  });
  return order;
};

const getOrders = async (branchId, { status, orderType, date, waiterId, page = 1, limit = 20 }) => {
  const take = parseInt(limit, 10) || 20;
  const skip = (parseInt(page, 10) - 1) * take;
  const where = { branchId };

  // if (status)    where.status    = status;

  // if (status) {
  // const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
  // where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  // }

  if (status) {
    const statuses = String(status).split(',').map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }

  if (orderType) where.orderType = orderType;
  if (waiterId) where.waiterId = waiterId;
  if (date) {
    const s = new Date(date); s.setHours(0, 0, 0, 0);
    const e = new Date(date); e.setHours(23, 59, 59, 999);
    where.createdAt = { gte: s, lte: e };
  }
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: { select: { name: true, image: true } }, variant: true } },
        table: { select: { id: true, number: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
        payment: { select: { paymentStatus: true, totalAmount: true, invoiceNumber: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page: parseInt(page, 10), pages: Math.ceil(total / take) };
};

const getOrderById = async (id) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { menuItem: { include: { category: true } }, variant: true } },
      table: true,
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      waiter: { select: { id: true, firstName: true, lastName: true } },
      payment: true,
      statusHistory: { orderBy: { changedAt: 'asc' } },
      feedback: true,
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  return order;
};

const updateOrderStatus = async (orderId, { status, note }) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found', 404);
  validateTransition(order.status, status);

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.order.update({
      where: { id: orderId },
      data: { status, actualServedAt: status === 'SERVED' ? new Date() : undefined },
      include: { items: { include: { menuItem: true } }, table: true },
    });
    await tx.orderStatusHistory.create({ data: { orderId, status, note: note || null } });

    if (u.tableId && ['SERVED', 'CANCELLED'].includes(status)) {
      const activeCount = await tx.order.count({
        where: { tableId: u.tableId, status: { notIn: ['SERVED', 'CANCELLED', 'REFUNDED'] }, id: { not: orderId } },
      });
      if (activeCount === 0) await tx.table.update({ where: { id: u.tableId }, data: { status: 'AVAILABLE' } });
    }
    return u;
  });

  // Kitchen update events (PREPARING, READY) go ONLY to the waiter who owns the order + managers.
  // CONFIRMED / CANCELLED go to chefs + managers.
  // Other events (SERVED, REFUNDED) go branch-wide for cashier + managers.
  const kitchenUpdateStatuses = ['PREPARING', 'READY'];
  const chefStatuses          = ['CONFIRMED', 'CANCELLED'];

  if (kitchenUpdateStatuses.includes(status) && order.waiterId) {
    socketService.emitToWaiter(order.branchId, order.waiterId, 'order_status_updated', {
      orderId, orderNumber: order.orderNumber, status,
      waiterId: order.waiterId,
    });
  } else if (chefStatuses.includes(status)) {
    socketService.emitToKitchen(order.branchId, 'order_status_updated', {
      orderId, orderNumber: order.orderNumber, status,
      waiterId: order.waiterId || null,
    });
  } else {
    // SERVED, REFUNDED → branch-wide (cashier, managers)
    socketService.emitToBranch(order.branchId, 'order_status_updated', {
      orderId, orderNumber: order.orderNumber, status,
      waiterId: order.waiterId || null,
    });
  }

  if (status === 'READY') {
    // Also notify the specific waiter via order_ready event
    if (order.waiterId) {
      socketService.emitToWaiter(order.branchId, order.waiterId, 'order_ready', {
        orderId, orderNumber: order.orderNumber,
      });
    }
    if (order.customerId) {
      socketService.emitToUser(order.customerId, 'order_ready', { orderId, orderNumber: order.orderNumber });
    }
  }
  return updated;
};

const markItemPrepared = async (orderId, orderItemId) => {
  const item = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { isPrepared: true, preparedAt: new Date() },
  });
  const unprepared = await prisma.orderItem.count({ where: { orderId, isPrepared: false } });
  if (unprepared === 0) {
    await updateOrderStatus(orderId, { status: 'READY', note: 'All items prepared by kitchen' });
  }
  return item;
};

const cancelOrder = async (orderId, reason) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('Order not found', 404);
  if (['SERVED', 'CANCELLED', 'REFUNDED'].includes(order.status))
    throw new AppError(`Order cannot be cancelled from ${order.status} status`, 400);
  return updateOrderStatus(orderId, { status: 'CANCELLED', note: reason || 'Cancelled by staff' });
};

const getKitchenOrders = async (branchId) =>
  prisma.order.findMany({
    where: { branchId, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } },
    orderBy: { createdAt: 'asc' },
    include: {
      items: { include: { menuItem: { select: { name: true, preparationTime: true, isVeg: true } }, variant: true } },
      table: { select: { number: true } },
    },
  });

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus, markItemPrepared, cancelOrder, getKitchenOrders };
