const notifService = require('../service/notification.service');

const send = async (req, res) => {
  const { role, userId, branchId, restaurantId } = req.user;
  const { toRole, toUserId, message, title, type } = req.body;
  if (!message || !toRole) return res.status(400).json({ success: false, message: 'message and toRole are required' });

  const record = await notifService.sendMessage({
    fromUserId: userId,
    fromRole:   role,
    toRole,
    toUserId:     toUserId     || null,
    restaurantId: restaurantId || req.body.restaurantId || null,
    branchId:     branchId     || req.body.branchId     || null,
    title:        title        || null,
    message,
    type:         type         || 'MESSAGE',
  });
  res.status(201).json({ success: true, data: record });
};

const inbox = async (req, res) => {
  const { role, branchId, restaurantId } = req.user;
  const result = await notifService.getMessages(req.user.userId, role, {
    restaurantId, branchId,
    page:  req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, ...result });
};

const outbox = async (req, res) => {
  const result = await notifService.getSentMessages(req.user.userId, {
    page:  req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, ...result });
};

const markRead = async (req, res) => {
  const msg = await notifService.markRead(req.params.id, req.user.userId);
  res.json({ success: true, data: msg });
};

const markAllRead = async (req, res) => {
  const { role, branchId, restaurantId } = req.user;
  const result = await notifService.markAllRead(req.user.userId, role, { restaurantId, branchId });
  res.json({ success: true, ...result });
};

const unreadCount = async (req, res) => {
  const { role, branchId, restaurantId } = req.user;
  const result = await notifService.getUnreadCount(role, { restaurantId, branchId });
  res.json({ success: true, ...result });
};

module.exports = { send, inbox, outbox, markRead, markAllRead, unreadCount };
