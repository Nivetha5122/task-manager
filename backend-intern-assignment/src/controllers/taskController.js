const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/ApiResponse');

/**
 * @route POST /api/v1/tasks
 * @access Private (user, admin)
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      owner: req.user._id,
    });

    sendSuccess(res, {
      statusCode: 201,
      message: 'Task created successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/tasks
 * @access Private
 * - A normal "user" only sees their own tasks.
 * - An "admin" sees all tasks by default, and can filter to a specific
 *   owner via ?owner=<userId> if needed.
 * Supports pagination (?page, ?limit) and filtering (?status, ?priority).
 */
const getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, priority, owner } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (req.user.role === 'admin') {
      if (owner) filter.owner = owner;
      // else: no owner filter -> admin sees everything
    } else {
      filter.owner = req.user._id;
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('owner', 'name email role'),
      Task.countDocuments(filter),
    ]);

    sendSuccess(res, {
      statusCode: 200,
      message: 'Tasks fetched successfully',
      data: { tasks },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/tasks/:id
 * @access Private (owner or admin)
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('owner', 'name email role');

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (req.user.role !== 'admin' && task.owner._id.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    sendSuccess(res, {
      statusCode: 200,
      message: 'Task fetched successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/v1/tasks/:id
 * @access Private (owner or admin)
 */
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    sendSuccess(res, {
      statusCode: 200,
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/v1/tasks/:id
 * @access Private (owner or admin)
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      throw ApiError.notFound('Task not found');
    }

    if (req.user.role !== 'admin' && task.owner.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have access to this task');
    }

    await task.deleteOne();

    sendSuccess(res, {
      statusCode: 200,
      message: 'Task deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
