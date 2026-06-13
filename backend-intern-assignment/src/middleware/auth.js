const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

/**
 * Protect routes: verifies the JWT sent in the Authorization header
 * (format: "Bearer <token>") and attaches the authenticated user to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Not authorized, no token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Session expired, please log in again');
      }
      throw ApiError.unauthorized('Not authorized, invalid token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User belonging to this token no longer exists');
    }

    req.user = user; // full mongoose doc (password is excluded via select:false)
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based access control.
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authorized'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
};

module.exports = { protect, authorize };
