const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require('../../controllers/taskController');
const {
  createTaskValidator,
  updateTaskValidator,
  taskIdValidator,
  listTasksValidator,
} = require('../../validators/validators');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(protect);

/**
 * @openapi
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task (owned by the authenticated user)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Finish backend assignment
 *               description:
 *                 type: string
 *                 example: Implement auth, RBAC, CRUD and docs
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *   get:
 *     summary: List tasks (own tasks for "user", all tasks for "admin")
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, in-progress, completed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: owner
 *         schema: { type: string }
 *         description: (admin only) filter tasks by owner user id
 *     responses:
 *       200:
 *         description: Paginated list of tasks
 *       401:
 *         description: Not authorized
 */
router.route('/')
  .post(createTaskValidator, createTask)
  .get(listTasksValidator, getTasks);

/**
 * @openapi
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a single task by id (owner or admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task details
 *       403:
 *         description: Forbidden - not the owner / not an admin
 *       404:
 *         description: Task not found
 *   put:
 *     summary: Update a task (owner or admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [pending, in-progress, completed] }
 *               priority: { type: string, enum: [low, medium, high] }
 *               dueDate: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *   delete:
 *     summary: Delete a task (owner or admin only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.route('/:id')
  .get(taskIdValidator, getTaskById)
  .put(updateTaskValidator, updateTask)
  .delete(taskIdValidator, deleteTask);

// Example of an admin-only route (kept for demonstrating RBAC beyond ownership checks)
// router.get('/admin/all', authorize('admin'), getTasks);

module.exports = router;
