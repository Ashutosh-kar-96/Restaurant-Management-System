const { prisma } = require('../../../config/database');

const getDashboard = async (branchId, date) => {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);

  const [totalOrders, revenue, activeOrders, avgOrderValue, topItems] = await prisma.$transaction([
    prisma.order.count({ where: { branchId, createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } } }),
    prisma.payment.aggregate({ where: { order: { branchId, createdAt: { gte: start, lte: end } }, paymentStatus: 'PAID' }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { branchId, status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } } }),
    prisma.payment.aggregate({ where: { order: { branchId, createdAt: { gte: start, lte: end } }, paymentStatus: 'PAID' }, _avg: { totalAmount: true } }),
    prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: { order: { branchId, createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } } },
      _sum:   { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  const topItemsWithNames = await Promise.all(topItems.map(async (i) => {
    const mi = await prisma.menuItem.findUnique({ where: { id: i.menuItemId }, select: { name: true, basePrice: true } });
    return { ...mi, id: i.menuItemId, quantitySold: i._sum.quantity };
  }));

  return {
    totalOrders,
    totalRevenue:  parseFloat(revenue._sum.totalAmount || 0),
    activeOrders,
    avgOrderValue: parseFloat(avgOrderValue._avg.totalAmount || 0),
    topItems: topItemsWithNames,
  };
};

// FIX: aggregate payments by date properly for chart data
const getRevenue = async (branchId, startDate, endDate) => {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

  // Raw payment records for daily grouping
  const rawPayments = await prisma.payment.findMany({
    where: { order: { branchId, createdAt: { gte: start, lte: end } }, paymentStatus: 'PAID' },
    select: { totalAmount: true, paymentMode: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date for the line/bar chart
  const byDateMap = {};
  for (const p of rawPayments) {
    const d = p.createdAt.toISOString().split('T')[0];
    if (!byDateMap[d]) byDateMap[d] = 0;
    byDateMap[d] += parseFloat(p.totalAmount);
  }
  const weeklyRevenue = Object.entries(byDateMap).map(([date, revenue]) => ({ date, revenue }));

  // Group by payment mode
  const modeMap = {};
  for (const p of rawPayments) {
    if (!modeMap[p.paymentMode]) modeMap[p.paymentMode] = 0;
    modeMap[p.paymentMode] += parseFloat(p.totalAmount);
  }
  const byPaymentMode = Object.entries(modeMap).map(([paymentMode, total]) => ({
    paymentMode,
    _sum: { totalAmount: total },
  }));

  const totalRevenue = rawPayments.reduce((s, p) => s + parseFloat(p.totalAmount), 0);

  return { weeklyRevenue, byPaymentMode, totalRevenue };
};

const getStaffPerformance = async (branchId, startDate, endDate) => {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

  // FIX: use ALL completed orders (SERVED or with payment), not just waiterId-tagged ones
  const payments = await prisma.payment.findMany({
    where: {
      paymentStatus: 'PAID',
      createdAt: { gte: start, lte: end },
      order: { branchId },
    },
    include: {
      order: {
        include: { waiter: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  const map = {};
  for (const p of payments) {
    const waiter = p.order?.waiter;
    const key    = waiter?.id || '__unassigned__';
    if (!map[key]) {
      map[key] = {
        waiter: waiter || { id: null, firstName: 'Unassigned', lastName: '' },
        orders: 0,
        revenue: 0,
      };
    }
    map[key].orders++;
    map[key].revenue += parseFloat(p.totalAmount);
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
};

const getInventoryReport = async (branchId) => {
  const items = await prisma.inventory.findMany({
    where: { branchId },
    include: { supplier: { select: { name: true } } },
    orderBy: { alertLevel: 'desc' },
  });
  return {
    items,
    summary: {
      total:      items.length,
      lowStock:   items.filter((i) => i.alertLevel === 'LOW').length,
      critical:   items.filter((i) => i.alertLevel === 'CRITICAL').length,
      outOfStock: items.filter((i) => i.alertLevel === 'OUT_OF_STOCK').length,
    },
  };
};

module.exports = { getDashboard, getRevenue, getStaffPerformance, getInventoryReport };
