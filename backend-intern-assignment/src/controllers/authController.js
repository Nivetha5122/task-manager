const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/ApiResponse');
const generateToken = require('../utils/generateToken');

/**
 * @route POST /api/v1/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('A user with this email already exists');
    }

    // Note: allowing role to be set on register is convenient for testing
    // role-based access. In a production system, admin creation would be
    // restricted to an already-authenticated admin (see README security notes).
    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'admin' : 'user',
    });

    const token = generateToken(user);

    sendSuccess(res, {
      statusCode: 201,
      message: 'User registered successfully',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = generateToken(user);
    user.password = undefined;

    sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    sendSuccess(res, {
      statusCode: 200,
      message: 'Current user fetched successfully',
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
