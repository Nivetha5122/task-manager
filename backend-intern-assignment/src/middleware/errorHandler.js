const ApiError = require('../utils/ApiError');

/**
 * Catches requests to undefined routes and forwards a 404 ApiError.
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized error handler. Converts known error types (Mongoose validation,
 * duplicate key, cast errors, JSON parse errors) into consistent ApiError
 * shapes, then sends a uniform JSON error response.
 *
 * Response shape:
 * { success: false, message, errors: [ { field, message } ] }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`${field} already exists`);
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for '${err.path}': ${err.value}`);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  if (statusCode === 500) {
    // Log unexpected errors with full stack for debugging
    console.error('💥 Unexpected error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors && error.errors.length ? error.errors : undefined,
    ...(process.env.NODE_ENV === 'development' && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = { notFound, errorHandler };
