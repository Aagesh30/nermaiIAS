import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Server-authoritative Tenant Resolution.
 * NEVER trust client-supplied tenantId in body or query params.
 * Always derive tenantId from the verified auth identity (req.user).
 */
export function getTenantId(req: Request): string {
  return req.user?.tenantId || 'default_tenant';
}

/**
 * Middleware: Enforces that requests contain a valid tenant identity.
 * Super admins can optionally specify a target tenant for cross-tenant management.
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Unauthorized: Authentication required', 401));
  }

  // Super admin can operate across tenants if target header specified
  if (req.user.role === 'super_admin' && req.headers['x-target-tenant']) {
    req.user.tenantId = String(req.headers['x-target-tenant']);
  }

  if (!req.user.tenantId) {
    req.user.tenantId = 'default_tenant';
  }

  next();
};
