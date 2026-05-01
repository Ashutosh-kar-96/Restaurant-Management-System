const svc = require('../service/restaurant.service');
const { successResponse } = require('../../../utils/response');

const create           = async (req, res) => res.status(201).json(successResponse('Restaurant created', await svc.createRestaurant(req.body)));
const getAll           = async (req, res) => res.json(successResponse('Restaurants fetched',            await svc.getAllRestaurants(req.query)));
const getById          = async (req, res) => res.json(successResponse('Restaurant fetched',             await svc.getRestaurantById(req.params.id)));
const update           = async (req, res) => res.json(successResponse('Restaurant updated',             await svc.updateRestaurant(req.params.id, req.body)));
const remove           = async (req, res) => res.json(successResponse('Restaurant deleted',             await svc.deleteRestaurant(req.params.id)));
const createBranch     = async (req, res) => res.status(201).json(successResponse('Branch created',    await svc.createBranch(req.params.id, req.body)));
const getBranches      = async (req, res) => res.json(successResponse('Branches fetched',               await svc.getBranches(req.params.id)));
const updateBranch     = async (req, res) => res.json(successResponse('Branch updated',                 await svc.updateBranch(req.params.branchId, req.body)));
const deleteBranch     = async (req, res) => res.json(successResponse('Branch deleted',                 await svc.deleteBranch(req.params.branchId)));
const addStaff         = async (req, res) => res.status(201).json(successResponse('Staff added',        await svc.addStaff(req.params.id, req.body)));
const getStaff         = async (req, res) => res.json(successResponse('Staff fetched',                  await svc.getStaff(req.params.id)));
const removeStaff      = async (req, res) => res.json(successResponse('Staff removed',                  await svc.removeStaff(req.params.id, req.params.userId)));
const updateStaffRole  = async (req, res) => res.json(successResponse('Role updated',                   await svc.updateStaffRole(req.params.id, req.params.userId, req.body)));

module.exports = { create, getAll, getById, update, remove, createBranch, getBranches, updateBranch, deleteBranch, addStaff, getStaff, removeStaff, updateStaffRole };
