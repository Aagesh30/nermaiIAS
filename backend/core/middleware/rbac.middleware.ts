import { Request, Response, NextFunction } from 'express';
import { Permission, RolePermissions } from '../permissions';
import { AppError } from '../errors/AppError';

/**
 * Validates that the authenticated user possesses a specific permission based on their role.
 * Super Admin implicitly passes all permission checks.
 */
export const requirePermission = (requiredPermission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Forbidden: User not authenticated', 403));
    }

    const { role } = req.user;

    // Fast fail for unknown roles
    if (!role) {
      return next(new AppError('Forbidden: No role assigned', 403));
    }

    // Lookup permissions for the current role
    const permissionsForRole = RolePermissions[role.toLowerCase()] || [];

    // Grant if role contains the exact permission OR if user is a super admin
    if (role === 'super_admin' || permissionsForRole.includes(requiredPermission)) {
      return next();
    }

    return next(new AppError(`Forbidden: Missing permission [${requiredPermission}]`, 403));
  };
};
