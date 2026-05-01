// controller
const svc = require('../service/table.service');
const { successResponse } = require('../../../utils/response');

const getTables      = async (req, res) => res.json(successResponse('Tables fetched', await svc.getTables(req.params.branchId)));
const getTable       = async (req, res) => res.json(successResponse('Table fetched', await svc.getTableById(req.params.id)));
const createTable    = async (req, res) => res.status(201).json(successResponse('Table created', await svc.createTable(req.params.branchId, req.body)));
const updateTable    = async (req, res) => res.json(successResponse('Table updated', await svc.updateTable(req.params.id, req.body)));
const deleteTable    = async (req, res) => res.json(successResponse('Table deleted', await svc.deleteTable(req.params.id)));
const updateStatus   = async (req, res) => res.json(successResponse('Status updated', await svc.updateStatus(req.params.id, req.body.status)));
const regenerateQR   = async (req, res) => res.json(successResponse('QR regenerated', await svc.regenerateQR(req.params.id, req.params.branchId)));
const getBookings    = async (req, res) => res.json(successResponse('Bookings fetched', await svc.getBookings(req.params.branchId, req.query)));
const createBooking  = async (req, res) => res.status(201).json(successResponse('Booking created', await svc.createBooking(req.body)));
const updateBooking  = async (req, res) => res.json(successResponse('Booking updated', await svc.updateBooking(req.params.id, req.body)));

module.exports = { getTables, getTable, createTable, updateTable, deleteTable, updateStatus, regenerateQR, getBookings, createBooking, updateBooking };
