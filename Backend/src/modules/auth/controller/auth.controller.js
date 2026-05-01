const authService = require('../service/auth.service');
const { successResponse } = require('../../../utils/response');

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(successResponse('Registration successful', result));
};

const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.json(successResponse('Login successful', result));
};

const refreshToken = async (req, res) => {
  const tokens = await authService.refreshToken(req.body.refreshToken);
  res.json(successResponse('Token refreshed', tokens));
};

const logout = async (req, res) => {
  await authService.logout(req.user.userId);
  res.json(successResponse('Logged out successfully'));
};

const getProfile = async (req, res) => {
  const user = await authService.getProfile(req.user.userId);
  res.json(successResponse('Profile fetched', user));
};

const updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user.userId, req.body);
  res.json(successResponse('Profile updated', user));
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.userId, currentPassword, newPassword);
  res.json(successResponse('Password changed successfully'));
};

const getAllUsers = async (req, res) => {
  const { page, limit, role, search } = req.query;
  const result = await authService.getAllUsers({ page: +page || 1, limit: +limit || 20, role, search });
  res.json(successResponse('Users fetched', result));
};

const toggleUserStatus = async (req, res) => {
  const user = await authService.toggleUserStatus(req.params.id);
  res.json(successResponse('User status toggled', user));
};

const searchUsers = async (req, res) => {
  const users = await authService.searchUsers(req.query.q || '');
  res.json(successResponse('Users found', users));
};

module.exports = { register, login, refreshToken, logout, getProfile, updateProfile, changePassword, getAllUsers, toggleUserStatus, searchUsers };
