const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { prisma } = require('../../../config/database');
const { AppError } = require('../../../utils/AppError');

const generateTokens = (payload) => {
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' });
  return { accessToken, refreshToken };
};

const register = async ({ email, password, firstName, lastName, phone, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const hashed = await bcrypt.hash(password, 12);
  const user   = await prisma.user.create({
    data: { email, password: hashed, firstName, lastName, phone, role: role || 'CUSTOMER' },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, createdAt: true },
  });

  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
  return { user, tokens };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      restaurantStaff: {
        where:   { isActive: true },
        include: {
          restaurant: { select: { id: true, name: true, logo: true } },
          branch:     { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user)          throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Account is deactivated. Contact support.', 403);

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new AppError('Invalid email or password', 401);

  const staff = user.restaurantStaff[0];

  // FIX: RESTAURANT_ADMIN may not have a staff record — use their user record's perspective
  // For SUPER_ADMIN: no restaurantId/branchId needed
  // For RESTAURANT_ADMIN without staff entry: find their restaurant by ownership is not in schema,
  //   so we include ALL restaurantStaff and pick the first one if present.
  const tokenPayload = {
    userId:       user.id,
    email:        user.email,
    role:         user.role,
    restaurantId: staff?.restaurantId || null,
    branchId:     staff?.branchId     || null,
  };

  const tokens = generateTokens(tokenPayload);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken, lastLoginAt: new Date() } });

  const { password: _, refreshToken: __, ...safeUser } = user;
  return { user: safeUser, tokens };
};

const refreshToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findFirst({ where: { id: payload.userId, refreshToken: token } });
  if (!user) throw new AppError('Invalid refresh token', 401);

  const staff  = await prisma.restaurantStaff.findFirst({ where: { userId: user.id, isActive: true } });
  const tokens = generateTokens({
    userId:       user.id,
    email:        user.email,
    role:         user.role,
    restaurantId: staff?.restaurantId || null,
    branchId:     staff?.branchId     || null,
  });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
  return tokens;
};

const logout = async (userId) => {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, phone: true, avatar: true, createdAt: true,
      restaurantStaff: {
        where:  { isActive: true },
        select: {
          role: true,
          restaurant: { select: { id: true, name: true, logo: true } },
          branch:     { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateProfile = async (userId, data) => {
  const allowed = ['firstName', 'lastName', 'phone', 'avatar'];
  const update  = {};
  allowed.forEach((k) => { if (data[k] !== undefined) update[k] = data[k]; });
  return prisma.user.update({
    where:  { id: userId },
    data:   update,
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true },
  });
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user  = await prisma.user.findUnique({ where: { id: userId } });
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw new AppError('Current password is incorrect', 400);
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

const getAllUsers = async ({ page = 1, limit = 20, role, search }) => {
  const take = parseInt(limit, 10) || 20;
  const skip = (parseInt(page, 10) - 1) * take;
  const where = {};
  if (role)   where.role = role;
  if (search) where.OR   = [
    { email:     { contains: search } },
    { firstName: { contains: search } },
    { lastName:  { contains: search } },
  ];

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total };
};

const toggleUserStatus = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  return prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
};

// Search users by email (used by Staff management UI)
const searchUsers = async (query) => {
  if (!query || query.length < 2) return [];
  return prisma.user.findMany({
    where: {
      OR: [
        { email:     { contains: query } },
        { firstName: { contains: query } },
        { lastName:  { contains: query } },
      ],
      isActive: true,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
    take: 10,
  });
};

module.exports = { register, login, refreshToken, logout, getProfile, updateProfile, changePassword, getAllUsers, toggleUserStatus, searchUsers };
