import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../../infrastructure/firebase';
import { AppError } from '../errors/AppError';
import { logger } from '../logger';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid auth header prefix');
      throw new AppError('Unauthorized: Missing or invalid token', 401);
    }

    const token = authHeader.split('Bearer ')[1];

    // ── Step 1: Try our custom JWT (Admin / Staff / Student) ─────────────────
    // Only use the configured secret. No fallback secrets. No ignoreExpiration.
    let customError: any;
    try {
      const decodedCustom = jwt.verify(token, env.JWT_SECRET) as any;

      if (decodedCustom && (decodedCustom.userId || decodedCustom.user_id || decodedCustom.sub || decodedCustom.id)) {
        const uid = decodedCustom.userId || decodedCustom.user_id || decodedCustom.sub || decodedCustom.id;
        req.user = {
          userId: uid,
          tenantId: decodedCustom.tenantId || 'default_tenant',
          role: decodedCustom.role || (decodedCustom.isAdmin ? 'super_admin' : 'student'),
          programMemberships: decodedCustom.programMemberships || [],
          studentId: decodedCustom.studentId || null,
          name: decodedCustom.name || '',
          email: decodedCustom.email || '',
          username: decodedCustom.username || '',
          sessionId: decodedCustom.sessionId || undefined,
        };
        logger.info(`Auth verified via Custom JWT for UID: ${uid}`);
        return next();
      }
    } catch (e) {
      customError = e;
      // Only log at debug level — expected for Firebase ID tokens
      logger.debug('Custom JWT verification failed (trying Firebase)', { error: (e as any)?.message });
    }

    // ── Step 2: Try Firebase ID Token ─────────────────────────────────────────
    try {
      const decodedToken = await auth.verifyIdToken(token);
      logger.info(`Auth verified for UID: ${decodedToken.uid}`, { claims: decodedToken });

      req.user = {
        userId: decodedToken.uid,
        tenantId: (decodedToken.tenantId as string) || 'default_tenant',
        role: (decodedToken.role as string) || 'student',
        programMemberships: (decodedToken.programMemberships as any[]) || [],
        studentId: (decodedToken.studentId as string) || null,
        name: decodedToken.name || (decodedToken as any).displayName || '',
        email: decodedToken.email || '',
        // currentBatchId intentionally NOT read from JWT.
        // Access context (batchIds, programs) is resolved via AccessCache on each request.
      };

      return next();
    } catch (fbError) {
      logger.warn('Authentication failed (both Custom JWT and Firebase)', { customError, fbError });
      return next(new AppError(`Unauthorized: Token verification failed`, 401));
    }
  } catch (error) {
    logger.warn('Authentication failed in wrapper', { error });
    next(new AppError('Unauthorized: Token verification failed completely', 401));
  }
};

/**
 * Like requireAuth but also accepts the token as a ?token= query parameter.
 * Used for the /content stream route so web browsers can open PDFs directly
 * (browsers cannot set Authorization headers on window.open / Linking.openURL calls).
 */
export const requireAuthOrQueryToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Inject the query token into the Authorization header so the existing
  // requireAuth logic can handle it without duplication.
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  return requireAuth(req, res, next);
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Forbidden: User not authenticated', 403));
    }
    
    // allow super_admin to access anything, or check if role is in allowed list
    if (req.user.role === 'super_admin' || req.user.role === 'developer' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    return next(new AppError(`Forbidden: Requires one of roles [${allowedRoles.join(', ')}]`, 403));
  };
};

export const requirePermission = (featureKey: string, action: 'C' | 'R' | 'U' | 'D') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Forbidden: User not authenticated', 403));
    }
    
    // super_admin and developer bypass all granular checks
    if (req.user.role === 'super_admin' || req.user.role === 'developer') {
      return next();
    }

    try {
      const doc = await db.collection('role_permissions').doc(req.user.role).get();
      if (!doc.exists) {
        return next(new AppError(`Forbidden: Permissions not configured for role ${req.user.role}`, 403));
      }

      const data = doc.data() || {};
      const perm = data[featureKey];

      // Handle permission levels
      if (!perm || perm === 'none') {
        return next(new AppError(`Forbidden: You do not have access to this feature (${featureKey})`, 403));
      }

      if (action === 'R') {
        // 'view', 'edit_on_approval', 'edit_direct', 'CRUD', 'CRU only', 'CR only' all allow Read
        return next();
      }

      // Write Actions (C, U, D)
      if (perm === 'edit_direct' || perm === 'CRUD') {
        return next();
      }

      // For edit_on_approval, allow creation of draft documents (status: pending)
      if (perm === 'edit_on_approval' && action === 'C' && req.body && req.body.status === 'pending') {
        return next();
      }

      // Check legacy permission levels for compatibility
      if (perm === 'CRU only') {
        if (action === 'C' || action === 'U') return next();
      } else if (perm === 'CR only') {
        if (action === 'C') return next();
      }

      // Block direct writes for other permission levels (e.g., 'view', 'edit_on_approval')
      return next(new AppError(`Forbidden: Direct edit permission denied for ${featureKey}. Access level: ${perm}`, 403));

    } catch (err: any) {
      return next(new AppError(`Internal Server Error: Permission check failed (${err.message})`, 500));
    }
  };
};

export const requirePlayerJwt = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      throw new AppError('Unauthorized: Missing player token', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (!decoded || !decoded.userId || !decoded.classId) {
      throw new AppError('Unauthorized: Invalid player token payload', 401);
    }

    // Attach decoded player info directly to req (or req.user)
    req.user = {
      userId: decoded.userId,
      tenantId: 'default_tenant', // Not strictly needed for player tracking but keeps types happy
      role: 'student',
      programMemberships: [],
    };
    (req as any).sessionId = decoded.jti;
    
    // We can also attach the classId for convenience if needed, but it's in req.body usually.
    next();
  } catch (error) {
    logger.warn('Player JWT authentication failed', { error });
    next(new AppError('Unauthorized: Player token verification failed', 401));
  }
};

export const requireViewerJwt = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      logger.warn('Viewer JWT verification failed: Missing token');
      throw new AppError('Unauthorized: Missing viewer token', 401);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err: any) {
      logger.warn(`Viewer JWT verification failed: Signature invalid or expired (${err.message})`);
      throw new AppError(`Unauthorized: Invalid or expired viewer token (${err.message})`, 401);
    }

    if (!decoded || !decoded.userId || !decoded.resourceId) {
      logger.warn(`Viewer JWT verification failed: Missing required payload fields. Payload: ${JSON.stringify(decoded)}`);
      throw new AppError('Unauthorized: Invalid viewer token payload (missing resourceId or userId)', 401);
    }

    req.user = {
      userId: decoded.userId,
      tenantId: 'default_tenant',
      role: 'student',
      programMemberships: [],
    };
    
    return next();
  } catch (error: any) {
    // If not already an AppError, wrap it
    if (!(error instanceof AppError)) {
      logger.warn('Viewer JWT verification failed (Unexpected)', { error });
      return next(new AppError('Unauthorized: Viewer authentication failed', 401));
    }
    return next(error);
  }
};
