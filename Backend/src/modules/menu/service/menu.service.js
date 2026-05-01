const { prisma } = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');

// ── Categories ────────────────────────────────────────────────────────────────
const getCategories = async (restaurantId) =>
  prisma.menuCategory.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { items: true } } },
  });

const createCategory = async (restaurantId, data) => {
  if (!data.name?.trim()) throw new AppError('Category name is required', 400);
  return prisma.menuCategory.create({ data: { name: data.name.trim(), description: data.description || null, restaurantId } });
};

const updateCategory = async (id, data) => {
  const cat = await prisma.menuCategory.findUnique({ where: { id } });
  if (!cat) throw new AppError('Category not found', 404);
  return prisma.menuCategory.update({ where: { id }, data });
};

const deleteCategory = async (id) => {
  const items = await prisma.menuItem.count({ where: { categoryId: id, isAvailable: true } });
  if (items > 0) throw new AppError('Cannot delete category with active items', 400);
  return prisma.menuCategory.update({ where: { id }, data: { isActive: false } });
};

// ── Items ─────────────────────────────────────────────────────────────────────
const getItems = async (restaurantId, { categoryId, isAvailable, isVeg, search, page = 1, limit = 50 }) => {
  const take = parseInt(limit, 10) || 50;
  const skip = (parseInt(page, 10) - 1) * take;
  const where = { restaurantId };
  if (categoryId  !== undefined && categoryId !== '') where.categoryId  = categoryId;
  if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
  if (isVeg       !== undefined) where.isVeg       = isVeg === 'true';
  if (search) where.name = { contains: search };

  const [items, total] = await prisma.$transaction([
    prisma.menuItem.findMany({ where, skip, take, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { category: { select: { id: true, name: true } }, variants: true } }),
    prisma.menuItem.count({ where }),
  ]);
  return { items, total };
};

const getItemById = async (id) => {
  const item = await prisma.menuItem.findUnique({ where: { id }, include: { category: true, variants: true } });
  if (!item) throw new AppError('Menu item not found', 404);
  return item;
};

const createItem = async (restaurantId, data, imagePath) => {
  const { variants, ...itemData } = data;

  // Validate required fields
  if (!itemData.name?.trim())   throw new AppError('Item name is required', 400);
  if (!itemData.categoryId)      throw new AppError('Category is required', 400);
  if (!itemData.basePrice)       throw new AppError('Base price is required', 400);

  const basePrice = parseFloat(itemData.basePrice);
  if (isNaN(basePrice) || basePrice < 0) throw new AppError('Invalid base price', 400);

  // Convert string booleans from FormData
  if (typeof itemData.isVeg === 'string')       itemData.isVeg       = itemData.isVeg === 'true';
  if (typeof itemData.isFeatured === 'string')  itemData.isFeatured  = itemData.isFeatured === 'true';
  if (typeof itemData.isAvailable === 'string') itemData.isAvailable = itemData.isAvailable === 'true';

  return prisma.menuItem.create({
    data: {
      ...itemData,
      name: itemData.name.trim(),
      restaurantId,
      basePrice,
      taxRate:         parseFloat(itemData.taxRate  || 5),
      preparationTime: parseInt(itemData.preparationTime || 15, 10),
      sortOrder:       parseInt(itemData.sortOrder  || 0, 10),
      image:           imagePath || null,
      variants: variants?.length
        ? { create: variants.map((v) => ({ variant: v.variant, price: parseFloat(v.price) })) }
        : undefined,
    },
    include: { variants: true, category: true },
  });
};

const updateItem = async (id, data, imagePath) => {
  const { variants, ...itemData } = data;
  if (itemData.basePrice)       itemData.basePrice       = parseFloat(itemData.basePrice);
  if (itemData.taxRate)         itemData.taxRate         = parseFloat(itemData.taxRate);
  if (itemData.preparationTime) itemData.preparationTime = parseInt(itemData.preparationTime, 10);
  if (imagePath)                itemData.image           = imagePath;

  // Convert string booleans from FormData
  if (typeof itemData.isVeg === 'string')       itemData.isVeg       = itemData.isVeg === 'true';
  if (typeof itemData.isFeatured === 'string')  itemData.isFeatured  = itemData.isFeatured === 'true';
  if (typeof itemData.isAvailable === 'string') itemData.isAvailable = itemData.isAvailable === 'true';

  return prisma.$transaction(async (tx) => {
    if (variants?.length) {
      await tx.menuItemVariant.deleteMany({ where: { menuItemId: id } });
      itemData.variants = { create: variants.map((v) => ({ variant: v.variant, price: parseFloat(v.price) })) };
    }
    return tx.menuItem.update({ where: { id }, data: itemData, include: { variants: true, category: true } });
  });
};

const deleteItem = async (id) => {
  await getItemById(id);
  return prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
};

const toggleAvailability = async (id) => {
  const item = await getItemById(id);
  return prisma.menuItem.update({ where: { id }, data: { isAvailable: !item.isAvailable } });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, getItems, getItemById, createItem, updateItem, deleteItem, toggleAvailability };
