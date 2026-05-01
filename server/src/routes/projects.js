const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/roleCheck');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/projects — list user's projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.user.id } },
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          take: 5,
        },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create project
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      const project = await prisma.project.create({
        data: {
          name,
          description,
          creatorId: req.user.id,
          members: {
            create: { userId: req.user.id, role: 'ADMIN' },
          },
        },
        include: {
          _count: { select: { tasks: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          creator: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/projects/:id — get project details
router.get('/:id', authenticate, requireProjectRole(), async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id — update project
router.put(
  '/:id',
  authenticate,
  requireProjectRole('ADMIN'),
  [body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')],
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(description !== undefined && { description }) },
        include: {
          _count: { select: { tasks: true, members: true } },
          creator: { select: { id: true, name: true } },
        },
      });

      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/projects/:id — delete project
router.delete('/:id', authenticate, requireProjectRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

// =====================
// PROJECT MEMBERS
// =====================

// GET /api/projects/:id/members
router.get('/:id/members', authenticate, requireProjectRole(), async (req, res, next) => {
  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/members — add member by email
router.post(
  '/:id/members',
  authenticate,
  requireProjectRole('ADMIN'),
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  validate,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found. They must sign up first.' });
      }

      // Check if already a member
      const existing = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: req.params.id } },
      });
      if (existing) {
        return res.status(409).json({ error: 'User is already a member of this project' });
      }

      const member = await prisma.projectMember.create({
        data: { userId: user.id, projectId: req.params.id, role: 'MEMBER' },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });

      res.status(201).json({ member });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/projects/:id/members/:memberId — change role
router.put(
  '/:id/members/:memberId',
  authenticate,
  requireProjectRole('ADMIN'),
  [body('role').isIn(['ADMIN', 'MEMBER']).withMessage('Role must be ADMIN or MEMBER')],
  validate,
  async (req, res, next) => {
    try {
      const member = await prisma.projectMember.update({
        where: { id: req.params.memberId },
        data: { role: req.body.role },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });

      res.json({ member });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/projects/:id/members/:memberId — remove member
router.delete(
  '/:id/members/:memberId',
  authenticate,
  requireProjectRole('ADMIN'),
  async (req, res, next) => {
    try {
      const member = await prisma.projectMember.findUnique({
        where: { id: req.params.memberId },
      });

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Prevent removing self if only admin
      if (member.userId === req.user.id) {
        const adminCount = await prisma.projectMember.count({
          where: { projectId: req.params.id, role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin' });
        }
      }

      await prisma.projectMember.delete({ where: { id: req.params.memberId } });
      res.json({ message: 'Member removed' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
