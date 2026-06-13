const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');

const routes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ---------- Security & utility middleware ----------
app.use(helmet()); // sets various secure HTTP headers

// CORS - restrict to configured origin(s) in production
const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins }));

app.use(express.json({ limit: '10kb' })); // body parser with size limit (prevents large payload abuse)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(mongoSanitize()); // strips $ and . from req.body/query/params to prevent NoSQL injection

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Rate limiting - protects against brute force / abuse
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ---------- API documentation ----------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ---------- Routes ----------
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Task Manager API is running. See /api-docs for documentation.',
  });
});

// ---------- 404 + error handling (must be last) ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
