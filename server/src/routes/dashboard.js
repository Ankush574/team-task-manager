const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/dashboard — aggregated stats for the current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Get all projects user is a member of
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user.id },
      select: { projectId: true, role: true },
    });

    const projectIds = memberships.map((m) => m.projectId);

    // Total tasks assigned to user
    const myTasks = await prisma.task.count({
      where: { assigneeId: req.user.id, projectId: { in: projectIds } },
    });

    // Tasks by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    // Overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE'] },
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    // Recent tasks (last 10 updated)
    const recentTasks = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Tasks by priority
    const tasksByPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    // Project count
    const projectCount = projectIds.length;

    // Total tasks across all projects
    const totalTasks = await prisma.task.count({
      where: { projectId: { in: projectIds } },
    });

    // Format status counts
    const statusMap = {};
    for (const s of tasksByStatus) {
      statusMap[s.status] = s._count.id;
    }

    const priorityMap = {};
    for (const p of tasksByPriority) {
      priorityMap[p.priority] = p._count.id;
    }

    res.json({
      stats: {
        totalTasks,
        myTasks,
        projectCount,
        overdue: overdueTasks.length,
        byStatus: {
          TODO: statusMap.TODO || 0,
          IN_PROGRESS: statusMap.IN_PROGRESS || 0,
          REVIEW: statusMap.REVIEW || 0,
          DONE: statusMap.DONE || 0,
        },
        byPriority: {
          LOW: priorityMap.LOW || 0,
          MEDIUM: priorityMap.MEDIUM || 0,
          HIGH: priorityMap.HIGH || 0,
          URGENT: priorityMap.URGENT || 0,
        },
      },
      overdueTasks,
      recentTasks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
