// service
const QRCode   = require('qrcode');
const { prisma }   = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');

const getTables = async (branchId) =>
  prisma.table.findMany({ where: { branchId, isActive: true }, orderBy: [{ floor: 'asc' }, { number: 'asc' }], include: { _count: { select: { orders: true } } } });

const getTableById = async (id) => {
  const t = await prisma.table.findUnique({ where: { id }, include: { orders: { where: { status: { notIn: ['SERVED','CANCELLED','REFUNDED'] } }, include: { items: { include: { menuItem: true } } } } } });
  if (!t) throw new AppError('Table not found', 404);
  return t;
};

const createTable = async (branchId, data) => {
  const table = await prisma.table.create({ data: { ...data, branchId, capacity: parseInt(data.capacity) } });
  const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/order?tableId=${table.id}&branchId=${branchId}`;
  const qrCode = await QRCode.toDataURL(qrUrl);
  return prisma.table.update({ where: { id: table.id }, data: { qrCode } });
};

const updateTable   = async (id, data) => prisma.table.update({ where: { id }, data });
const deleteTable   = async (id) => prisma.table.update({ where: { id }, data: { isActive: false } });
const updateStatus  = async (id, status) => prisma.table.update({ where: { id }, data: { status } });

const regenerateQR = async (id, branchId) => {
  const qrUrl  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/order?tableId=${id}&branchId=${branchId}`;
  const qrCode = await QRCode.toDataURL(qrUrl);
  return prisma.table.update({ where: { id }, data: { qrCode } });
};

// Bookings
const getBookings = async (branchId, { date, status }) => {
  const where = { table: { branchId } };
  if (status) where.status = status;
  if (date) {
    const s = new Date(date); s.setHours(0,0,0,0);
    const e = new Date(date); e.setHours(23,59,59,999);
    where.bookingDate = { gte: s, lte: e };
  }
  return prisma.tableBooking.findMany({ where, include: { table: { select: { number: true, capacity: true } } }, orderBy: { bookingDate: 'asc' } });
};

const createBooking = async (data) => prisma.tableBooking.create({ data: { ...data, bookingDate: new Date(data.bookingDate) }, include: { table: { select: { number: true } } } });
const updateBooking = async (id, data) => prisma.tableBooking.update({ where: { id }, data });

module.exports = { getTables, getTableById, createTable, updateTable, deleteTable, updateStatus, regenerateQR, getBookings, createBooking, updateBooking };
