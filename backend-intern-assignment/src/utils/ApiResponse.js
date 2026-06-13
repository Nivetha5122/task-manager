/**
 * Sends a consistent success response shape across the whole API:
 * { success: true, message, data, meta? }
 */
const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null, meta = undefined }) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess };
