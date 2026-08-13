import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Ensures a student can only access or modify their own resource.
 * Admin and staff roles bypass this check.
 *
 * @param paramNames Key(s) in req.params or req.body to match against req.user.userId / req.user.studentId
 */
export const requireSelfOrAdmin = (paramNames: string[] = ['studentId', 'userId', 'id']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }

    const { role, userId, studentId } = req.user;

    // Privileged roles can access any resource in their tenant
    if (['super_admin', 'admin', 'staff', 'teacher'].includes(role)) {
      return next();
    }

    // For students, check if target ID matches their own identity
    let targetId: string | undefined;
    for (const key of paramNames) {
      if (req.params?.[key]) {
        targetId = req.params[key];
        break;
      }
      if (req.body?.[key]) {
        targetId = req.body[key];
        break;
      }
      if (req.query?.[key]) {
        targetId = String(req.query[key]);
        break;
      }
    }

    // If no target param was found in request, allow (e.g. self-scoped route like /me)
    if (!targetId) {
      return next();
    }

    const isOwner = targetId === userId || (studentId && targetId === studentId);
    if (!isOwner) {
      return next(new AppError('Forbidden: You can only access your own data', 403));
    }

    next();
  };
};
