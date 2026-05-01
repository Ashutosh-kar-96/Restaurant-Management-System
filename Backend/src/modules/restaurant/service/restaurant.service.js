const { prisma }   = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');
const { generateSlug } = require('../../../utils/helpers');

const createRestaurant = async (data) => {
  const slug = generateSlug(data.name);
  return prisma.restaurant.create({ data: { ...data, slug } });
};

const getAllRestaurants = async ({ page = 1, limit = 20, search }) => {
  const page_  = parseInt(page)  || 1;
  const limit_ = parseInt(limit) || 20;
  const skip   = (page_ - 1) * limit_;
  const where  = {};
  if (search) where.OR = [{ name: { contains: search } }, { city: { contains: search } }];
  const [restaurants, total] = await prisma.$transaction([
    prisma.restaurant.findMany({ where, skip, take: limit_, orderBy: { createdAt: 'desc' }, include: { _count: { select: { branches: true } } } }),
    prisma.restaurant.count({ where }),
  ]);
  return { restaurants, total };
};

const getRestaurantById = async (id) => {
  const r = await prisma.restaurant.findUnique({ where: { id }, include: { branches: true, _count: { select: { menuItems: true, staff: true } } } });
  if (!r) throw new AppError('Restaurant not found', 404);
  return r;
};

const updateRestaurant = async (id, data) => {
  await getRestaurantById(id);
  return prisma.restaurant.update({ where: { id }, data });
};

const deleteRestaurant = async (id) => {
  await getRestaurantById(id);
  return prisma.restaurant.update({ where: { id }, data: { isActive: false } });
};

const createBranch = async (restaurantId, data) => {
  await getRestaurantById(restaurantId);
  return prisma.branch.create({ data: { ...data, restaurantId } });
};

const getBranches = async (restaurantId) => {
  return prisma.branch.findMany({
    where: { restaurantId, isActive: true },
    include: { _count: { select: { tables: true, orders: true } } },
  });
};

const updateBranch = async (branchId, data) => {
  return prisma.branch.update({ where: { id: branchId }, data });
};

const deleteBranch = async (branchId) => {
  return prisma.branch.update({ where: { id: branchId }, data: { isActive: false } });
};

const addStaff = async (restaurantId, { userId, branchId, role }) => {
  const existing = await prisma.restaurantStaff.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (existing) {
    // Already exists — update role and branch instead of throwing error
    await prisma.user.update({ where: { id: userId }, data: { role } });
    return prisma.restaurantStaff.update({
      where: { userId_restaurantId: { userId, restaurantId } },
      data:  { isActive: true, role, branchId: branchId || null },
    });
  }
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return prisma.restaurantStaff.create({ data: { userId, restaurantId, branchId: branchId || null, role } });
};

const getStaff = async (restaurantId) => {
  return prisma.restaurantStaff.findMany({
    where:   { restaurantId, isActive: true },
    include: {
      user:   { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true, isActive: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });
};

const removeStaff = async (restaurantId, userId) => {
  return prisma.restaurantStaff.updateMany({
    where: { restaurantId, userId },
    data:  { isActive: false },
  });
};

const updateStaffRole = async (restaurantId, userId, { role, branchId }) => {
  const existing = await prisma.restaurantStaff.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!existing) throw new AppError('Staff member not found', 404);
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return prisma.restaurantStaff.update({
    where: { userId_restaurantId: { userId, restaurantId } },
    data:  { role, branchId: branchId !== undefined ? (branchId || null) : existing.branchId },
  });
};

module.exports = {
  createRestaurant, getAllRestaurants, getRestaurantById, updateRestaurant, deleteRestaurant,
  createBranch, getBranches, updateBranch, deleteBranch,
  addStaff, getStaff, removeStaff, updateStaffRole,
};
