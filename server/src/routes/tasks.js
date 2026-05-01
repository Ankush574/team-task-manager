const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/roleCheck');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/projects/:projectId/tasks — list tasks with filters
router.get(
  '/projects/:projectId/tasks',
  authenticate,
  requireProjectRole(),
  async (req, res, next) => {
    try {
      const { status, priority, assigneeId, search } = req.query;

      const where = { projectId: req.params.projectId };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assigneeId) where.assigneeId = assigneeId;
      if (search) {
        where.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      res.json({ tasks });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/projects/:projectId/tasks — create task
router.post(
  '/projects/:projectId/tasks',
  authenticate,
  requireProjectRole(),
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('description').optional().trim(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('assigneeId').optional({ values: 'null' }).isUUID(),
    body('dueDate').optional({ values: 'null' }).isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, description, status, priority, assigneeId, dueDate } = req.body;

      // Validate assignee is a project member
      if (assigneeId) {
        const isMember = await prisma.projectMember.findUnique({
          where: { userId_projectId: { userId: assigneeId, projectId: req.params.projectId } },
        });
        if (!isMember) {
          return res.status(400).json({ error: 'Assignee must be a project member' });
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          projectId: req.params.projectId,
          creatorId: req.user.id,
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          creator: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/tasks/:taskId — get single task
router.get('/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify membership
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } },
    });
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:taskId — update task
router.put(
  '/tasks/:taskId',
  authenticate,
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('assigneeId').optional({ values: 'null' }),
    body('dueDate').optional({ values: 'null' }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Verify membership
      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      const { title, description, status, priority, assigneeId, dueDate } = req.body;

      // Validate assignee if provided
      if (assigneeId) {
        const isMember = await prisma.projectMember.findUnique({
          where: { userId_projectId: { userId: assigneeId, projectId: task.projectId } },
        });
        if (!isMember) {
          return res.status(400).json({ error: 'Assignee must be a project member' });
        }
      }

      const updated = await prisma.task.update({
        where: { id: req.params.taskId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        },
        include: {
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          creator: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      res.json({ task: updated });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/tasks/:taskId — delete task (Admin only)
router.delete('/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify admin membership
    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: task.projectId } },
    });
    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required to delete tasks' });
    }

    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
