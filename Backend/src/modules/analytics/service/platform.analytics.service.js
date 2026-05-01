const { prisma } = require('../../../config/database');

// Super Admin: revenue across ALL restaurants & branches
const getPlatformRevenue = async ({ startDate, endDate, restaurantId }) => {
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(23, 59, 59, 999);

  // Build where clause
  const paymentWhere = {
    paymentStatus: 'PAID',
    createdAt: { gte: start, lte: end },
  };
  if (restaurantId) {
    paymentWhere.order = { branch: { restaurantId } };
  }

  // Total across all
  const [totalRevenue, allPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        totalAmount: true,
        paymentMode: true,
        createdAt: true,
        order: {
          select: {
            branch: {
              select: {
                id: true,
                name: true,
                restaurant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Daily revenue chart
  const byDateMap = {};
  for (const p of allPayments) {
    const d = p.createdAt.toISOString().split('T')[0];
    if (!byDateMap[d]) byDateMap[d] = 0;
    byDateMap[d] += parseFloat(p.totalAmount);
  }
  const dailyRevenue = Object.entries(byDateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

  // Per-branch breakdown
  const branchMap = {};
  for (const p of allPayments) {
    const br = p.order?.branch;
    if (!br) continue;
    if (!branchMap[br.id]) {
      branchMap[br.id] = {
        branchId:       br.id,
        branchName:     br.name,
        restaurantName: br.restaurant?.name || '—',
        revenue: 0,
        transactions: 0,
      };
    }
    branchMap[br.id].revenue      += parseFloat(p.totalAmount);
    branchMap[br.id].transactions += 1;
  }
  const byBranch = Object.values(branchMap)
    .map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);

  // Per-restaurant rollup
  const restMap = {};
  for (const b of byBranch) {
    if (!restMap[b.restaurantName]) {
      restMap[b.restaurantName] = { restaurantName: b.restaurantName, revenue: 0, transactions: 0, branches: 0 };
    }
    restMap[b.restaurantName].revenue      += b.revenue;
    restMap[b.restaurantName].transactions += b.transactions;
    restMap[b.restaurantName].branches     += 1;
  }
  const byRestaurant = Object.values(restMap).sort((a, b) => b.revenue - a.revenue);

  // Payment mode breakdown
  const modeMap = {};
  for (const p of allPayments) {
    if (!modeMap[p.paymentMode]) modeMap[p.paymentMode] = 0;
    modeMap[p.paymentMode] += parseFloat(p.totalAmount);
  }
  const byPaymentMode = Object.entries(modeMap).map(([mode, amount]) => ({ mode, amount: Math.round(amount * 100) / 100 }));

  return {
    totalRevenue:  Math.round(parseFloat(totalRevenue._sum.totalAmount || 0) * 100) / 100,
    transactions:  totalRevenue._count,
    dailyRevenue,
    byBranch,
    byRestaurant,
    byPaymentMode,
  };
};

module.exports = { getPlatformRevenue };
