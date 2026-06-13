const express = require('express');
const v1Routes = require('./v1');

const router = express.Router();

// API versioning: all v1 routes are namespaced under /api/v1
router.use('/v1', v1Routes);

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is up and running
 */
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

module.exports = router;
