const { prisma } = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');
const { generateInvoiceNumber, calculateGST } = require('../../../utils/helpers');
const { socketService } = require('../../../sockets');

const generateBill = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: true, variant: true } },
      table: { select: { number: true } },
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      branch: { include: { restaurant: true } },
    },
  });
  if (!order) throw new AppError('Order not found', 404);
  const gst = calculateGST(parseFloat(order.subtotal));
  return { order, gst, totalAmount: parseFloat(order.totalAmount) };
};

const processPayment = async ({ orderId, paymentMode, amountPaid, discount = 0, splits }) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) throw new AppError('Order not found', 404);
  if (order.payment) throw new AppError('Payment already processed for this order', 409);
  if (!['SERVED', 'READY'].includes(order.status))
    throw new AppError('Order must be READY or SERVED to process payment', 400);

  const discountAmount = parseFloat(discount) || 0;
  const totalAmount = parseFloat(order.totalAmount) - discountAmount;
  if (parseFloat(amountPaid) < totalAmount)
    throw new AppError(`Insufficient payment. Required: ₹${totalAmount.toFixed(2)}, received: ₹${parseFloat(amountPaid).toFixed(2)}`, 400);

  const gst = calculateGST(parseFloat(order.subtotal));

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        orderId,
        invoiceNumber: generateInvoiceNumber(),
        subtotal: order.subtotal,
        cgst: gst.cgst,
        sgst: gst.sgst,
        totalTax: gst.total,
        discountAmount,
        totalAmount,
        amountPaid: parseFloat(amountPaid),
        changeGiven: parseFloat(amountPaid) - totalAmount,
        paymentMode,
        paymentStatus: 'PAID',
        paidAt: new Date(),
        splits: splits?.length
          ? { create: splits.map((s) => ({ paymentMode: s.paymentMode, amount: parseFloat(s.amount) })) }
          : undefined,
      },
      include: { splits: true },
    });
    await tx.order.update({ where: { id: orderId }, data: { discountAmount, totalAmount, status: 'SERVED' } });

    if (order.tableId) {
      const active = await tx.order.count({
        where: { tableId: order.tableId, status: { notIn: ['SERVED', 'CANCELLED', 'REFUNDED'] }, id: { not: orderId } },
      });
      if (active === 0) await tx.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
    }
    return p;
  });

  socketService.emitToBranch(order.branchId, 'payment_received', {
    orderId, invoiceNumber: payment.invoiceNumber, amount: totalAmount,
  });

  // Return full payment with order details for invoice display
  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      order: {
        select: {
          orderNumber: true,
          orderType: true,
          table: { select: { number: true } },
          branch: { select: { name: true, restaurant: { select: { name: true, gstin: true } } } },
          items: { include: { menuItem: { select: { name: true } }, variant: { select: { variant: true } } } },
        },
      },
      splits: true,
    },
  });
};

const getInvoice = async (paymentId) => {
  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          items: { include: { menuItem: true, variant: true } },
          table: { select: { number: true } },
          customer: { select: { firstName: true, lastName: true, email: true } },
          branch: { include: { restaurant: true } },
        },
      },
      splits: true,
    },
  });
  if (!p) throw new AppError('Invoice not found', 404);
  return p;
};

const getPayments = async (branchId, { date, page = 1, limit = 20 }) => {
  const take = parseInt(limit, 10) || 20;
  const skip = (parseInt(page, 10) - 1) * take;
  const where = { order: { branchId } };
  if (date) {
    const s = new Date(date); s.setHours(0, 0, 0, 0);
    const e = new Date(date); e.setHours(23, 59, 59, 999);
    where.createdAt = { gte: s, lte: e };
  }
  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            orderType: true,
            table: { select: { number: true } },
            branch: { select: { name: true, restaurant: { select: { name: true, gstin: true } } } },
            items: { include: { menuItem: { select: { name: true } }, variant: { select: { variant: true } } } },
          },
        },
        splits: true,
      },
    }),
    prisma.payment.count({ where }),
  ]);
  const summary = await prisma.payment.aggregate({
    where: { ...where, paymentStatus: 'PAID' },
    _sum: { totalAmount: true, discountAmount: true },
    _avg: { totalAmount: true },
    _count: { id: true },
  });
  return {
    payments, total,
    summary: {
      totalRevenue: parseFloat(summary._sum.totalAmount || 0),
      totalDiscounts: parseFloat(summary._sum.discountAmount || 0),
      avgOrderValue: parseFloat(summary._avg.totalAmount || 0),
      transactions: summary._count.id,
    },
  };
};

module.exports = { generateBill, processPayment, getInvoice, getPayments };
