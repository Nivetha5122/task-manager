const { body, query, param, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after the express-validator chains. If any validator failed,
 * forwards a single ApiError(400) with a field-level error array.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  next(ApiError.badRequest('Validation failed', formatted));
};

// ---------- Auth validators ----------
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['user', 'admin']).withMessage("Role must be 'user' or 'admin'"),
  validate,
];

const loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Must be a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// ---------- Task validators ----------
const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status value'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority value'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date (ISO8601)'),
  validate,
];

const updateTaskValidator = [
  param('id').isMongoId().withMessage('Invalid task id'),
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status value'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority value'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date (ISO8601)'),
  validate,
];

const taskIdValidator = [
  param('id').isMongoId().withMessage('Invalid task id'),
  validate,
];

const listTasksValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status filter'),
  query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority filter'),
  validate,
];

module.exports = {
  validate,
  registerValidator,
  loginValidator,
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  listTasksValidator,
};
