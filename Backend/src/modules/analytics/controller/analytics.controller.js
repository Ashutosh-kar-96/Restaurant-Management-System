const svc         = require('../service/analytics.service');
const platformSvc = require('../service/platform.analytics.service');
const { successResponse } = require('../../../utils/response');
const { AppError } = require('../../../utils/AppError');

const getDashboard = async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  res.json(successResponse('Dashboard fetched', await svc.getDashboard(req.params.branchId, date)));
};

const getRevenue = async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) throw new AppError('startDate and endDate are required', 400);
  res.json(successResponse('Revenue fetched', await svc.getRevenue(req.params.branchId, startDate, endDate)));
};

const getStaffPerformance = async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) throw new AppError('startDate and endDate are required', 400);
  res.json(successResponse('Staff performance fetched', await svc.getStaffPerformance(req.params.branchId, startDate, endDate)));
};

const getInventoryReport = async (req, res) => {
  res.json(successResponse('Inventory report fetched', await svc.getInventoryReport(req.params.branchId)));
};

const getPlatformRevenue = async (req, res) => {
  const { startDate, endDate, restaurantId } = req.query;
  const end   = endDate   || new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0];
  res.json(successResponse('Platform revenue fetched', await platformSvc.getPlatformRevenue({ startDate: start, endDate: end, restaurantId })));
};

module.exports = { getDashboard, getRevenue, getStaffPerformance, getInventoryReport, getPlatformRevenue };
