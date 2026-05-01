const successResponse = (message, data = null, meta = null) => ({
  success: true,
  message,
  data,
  ...(meta && { meta }),
});

const errorResponse = (message, errors = null) => ({
  success: false,
  message,
  ...(errors && { errors }),
});

const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNext: page < Math.ceil(total / limit),
  hasPrev: page > 1,
});

module.exports = { successResponse, errorResponse, paginationMeta };
