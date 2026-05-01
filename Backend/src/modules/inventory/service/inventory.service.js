// service
const { prisma }   = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');
const { socketService } = require('../../../sockets');

const calcAlertLevel = (current, min) => {
  if (current <= 0)         return 'OUT_OF_STOCK';
  if (current <= min * 0.5) return 'CRITICAL';
  if (current <= min)       return 'LOW';
  return 'NORMAL';
};

const getAll = async (branchId) =>
  prisma.inventory.findMany({ where: { branchId }, include: { supplier: { select: { name: true } } }, orderBy: { alertLevel: 'asc' } });

const getById = async (id) => {
  const i = await prisma.inventory.findUnique({ where: { id }, include: { supplier: true, restockLogs: { orderBy: { restockedAt: 'desc' }, take: 10 } } });
  if (!i) throw new AppError('Inventory item not found', 404);
  return i;
};

const create = async (branchId, data) => {
  const current    = parseFloat(data.currentStock);
  const min        = parseFloat(data.minStockLevel);
  const alertLevel = calcAlertLevel(current, min);
  return prisma.inventory.create({ data: { ...data, branchId, currentStock: current, minStockLevel: min, maxStockLevel: parseFloat(data.maxStockLevel), costPerUnit: parseFloat(data.costPerUnit), alertLevel } });
};

const update = async (id, data) => {
  if (data.currentStock || data.minStockLevel) {
    const item = await getById(id);
    const current = parseFloat(data.currentStock ?? item.currentStock);
    const min     = parseFloat(data.minStockLevel ?? item.minStockLevel);
    data.alertLevel = calcAlertLevel(current, min);
  }
  return prisma.inventory.update({ where: { id }, data });
};

const restock = async (id, { quantity, costPerUnit, note }) => {
  const item    = await getById(id);
  const qty     = parseFloat(quantity);
  const cost    = parseFloat(costPerUnit);
  const newStock = parseFloat(item.currentStock) + qty;
  const alertLevel = calcAlertLevel(newStock, parseFloat(item.minStockLevel));

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inventory.update({ where: { id }, data: { currentStock: newStock, alertLevel, lastRestockedAt: new Date() } });
    await tx.inventoryRestockLog.create({ data: { inventoryId: id, quantity: qty, costPerUnit: cost, totalCost: qty * cost, note: note || null } });
    return updated;
  });
};

const getLowStock = async (branchId) =>
  prisma.inventory.findMany({ where: { branchId, alertLevel: { in: ['LOW','CRITICAL','OUT_OF_STOCK'] } }, include: { supplier: { select: { name: true, phone: true } } } });

const deductForOrder = async (orderId, branchId) => {
  const items = await prisma.orderItem.findMany({ where: { orderId }, select: { menuItemId: true, quantity: true } });
  for (const item of items) {
    const usages = await prisma.inventoryUsage.findMany({ where: { menuItemId: item.menuItemId }, include: { inventory: true } });
    for (const usage of usages) {
      const deduct   = parseFloat(usage.quantityUsed) * item.quantity;
      const newStock = Math.max(0, parseFloat(usage.inventory.currentStock) - deduct);
      const alertLevel = calcAlertLevel(newStock, parseFloat(usage.inventory.minStockLevel));
      await prisma.inventory.update({ where: { id: usage.inventoryId }, data: { currentStock: newStock, alertLevel } });
      if (['LOW','CRITICAL','OUT_OF_STOCK'].includes(alertLevel)) {
        socketService.emitToBranch(branchId, 'low_stock_alert', { inventoryId: usage.inventoryId, name: usage.inventory.name, alertLevel, currentStock: newStock });
      }
    }
  }
};

const getSuppliers = async () => prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
const createSupplier = async (data) => prisma.supplier.create({ data });

module.exports = { getAll, getById, create, update, restock, getLowStock, deductForOrder, getSuppliers, createSupplier };
