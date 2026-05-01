const prisma = require('../lib/prisma');

/**
 * Creates middleware that checks if the authenticated user is a member
 * of the project (from req.params.projectId or req.params.id) and
 * optionally requires a specific role.
 *
 * @param {'ADMIN'|'MEMBER'|null} requiredRole - Minimum role required, null = any member
 */
const requireProjectRole = (requiredRole = null) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: req.user.id,
            projectId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this project' });
      }

      if (requiredRole === 'ADMIN' && membership.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { requireProjectRole };
