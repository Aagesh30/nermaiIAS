import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../../infrastructure/firebase';
import { z } from 'zod';
import { env } from '../../config/env';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { SessionService, DeviceInfo } from '../../core/security/sessions/SessionService';
import { logger } from '../../core/logger';

// ─── Validation Schemas ────────────────────────────────────────────────────────

const loginSchema = z.object({
  identifier: z.string().optional(),
  username: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  // Device metadata for session tracking (all optional, never used for auth)
  deviceId: z.string().max(128).optional(),
  platform: z.enum(['web', 'ios', 'android', 'unknown']).optional(),
  appVersion: z.string().max(32).optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const normalizeMobile = (mobile: string) => mobile.replace(/\D/g, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract device info from request (for session tracking). Never used for auth. */
function extractDeviceInfo(req: Request, body: any): DeviceInfo {
  const ua = req.headers['user-agent'] || '';
  return {
    deviceId: typeof body.deviceId === 'string' ? body.deviceId.slice(0, 128) : undefined,
    platform: body.platform || (ua.includes('Mobile') ? 'android' : 'web'),
    os: ua.slice(0, 128),
    browser: ua.slice(0, 128),
    appVersion: typeof body.appVersion === 'string' ? body.appVersion.slice(0, 32) : undefined,
    ip: req.ip || req.socket?.remoteAddress || '',
    userAgent: ua.slice(0, 256),
  };
}

/**
 * Issue a short-lived access token (JWT).
 * Session management (refresh token TTL) is handled by SessionService.
 */
function issueAccessToken(payload: {
  userId: string;
  role: string;
  tenantId: string;
  email?: string;
  name?: string;
  studentId?: string | null;
  username?: string;
  batch?: string;
  isAdmin?: boolean;
  sessionId?: string;
}): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Set secure refresh token cookie for web clients.
 * Mobile clients receive the refresh token in the response body.
 */
function setRefreshTokenCookie(res: Response, refreshToken: string, expiresAt: string) {
  const expires = new Date(expiresAt);
  res.cookie('nermai_rt', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires,
    path: '/api/auth', // Scope cookie to auth endpoints only
  });
}

// ─── REGISTER STUDENT ──────────────────────────────────────────────────────────

export const registerStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, password, firstName, lastName } = registerSchema.parse(req.body);
    const normalizedMobile = phone ? normalizeMobile(phone) : null;
    const name = `${firstName} ${lastName}`.trim();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    const uid = userRecord.uid;

    await auth.setCustomUserClaims(uid, {
      role: 'student',
      tenantId: 'default_tenant',
    });

    const batch = db.batch();

    const profileRef = db.collection('student_profiles').doc(uid);
    batch.set(profileRef, {
      id: uid,
      rollNo: null,
      name,
      displayName: name,
      firstName,
      lastName,
      email,
      phoneNumber: normalizedMobile,
      tenantId: 'default_tenant',
      status: 'active',
      programMemberships: [],
      role: 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: uid,
      updatedBy: uid,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    const emailLookupRef = db.collection('identity_lookup').doc(email.toLowerCase());
    batch.set(emailLookupRef, { uid });

    if (normalizedMobile) {
      const mobileLookupRef = db.collection('identity_lookup').doc(normalizedMobile);
      batch.set(mobileLookupRef, { uid });
    }

    await batch.commit();

    res.status(201).json({
      status: 'success',
      data: { uid, email, phone: normalizedMobile, name, firstName, lastName, role: 'student' },
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// All credentials (including admin) are stored in Firestore with bcrypt hashes.
// No hardcoded passwords or demo bypasses.

export const loginStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const rawIdentifier = (body.identifier || body.username || body.email || body.phone || '').trim();
    const password = body.password;
    const device = extractDeviceInfo(req, body);

    if (!rawIdentifier) {
      return res.status(400).json({ status: 'error', message: 'Username or identifier is required' });
    }

    const lowerIdentifier = rawIdentifier.toLowerCase();

    // ── 1. Check admin_users collection (super_admin / admin accounts) ──────────
    let adminQuery = await db.collection('admin_users')
      .where('username', '==', rawIdentifier)
      .get();

    if (adminQuery.empty && lowerIdentifier !== rawIdentifier) {
      adminQuery = await db.collection('admin_users')
        .where('username', '==', lowerIdentifier)
        .get();
    }

    if (adminQuery.empty) {
      adminQuery = await db.collection('admin_users')
        .where('email', '==', lowerIdentifier)
        .get();
    }

    let adminDoc = adminQuery.docs.find(doc => doc.data().isDeleted !== true);
    if (!adminDoc && !adminQuery.empty) {
      adminDoc = adminQuery.docs[0];
    }

    if (adminDoc) {
      const adminData = adminDoc.data();

      if (adminData.isDeleted === true) {
        return res.status(401).json({ status: 'error', message: 'Account has been deactivated' });
      }

      const passwordMatch = await bcrypt.compare(password, adminData.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      }

      const role = adminData.role || 'admin';
      const tenantId = adminData.tenantId || 'default_tenant';

      // Issue access token (short-lived) + create session (for refresh token)
      const session = await SessionService.create(adminDoc.id, tenantId, role, device);

      const token = issueAccessToken({
        userId: adminDoc.id,
        email: adminData.email || '',
        name: adminData.name || adminData.username || '',
        role,
        tenantId,
        isAdmin: true,
        sessionId: session.sessionId,
      });

      setRefreshTokenCookie(res, session.refreshToken, session.expiresAt);

      return res.status(200).json({
        status: 'success',
        data: {
          token,
          // refreshToken returned in body for mobile clients; web uses the httpOnly cookie
          refreshToken: session.refreshToken,
          sessionId: session.sessionId,
          expiresIn: '900', // 15 minutes in seconds
          userId: adminDoc.id,
          localId: adminDoc.id,
          role,
          name: adminData.name || adminData.username || '',
          username: adminData.username || '',
          email: adminData.email || '',
        },
      });
    }

    // ── 2. Check users collection (student / staff accounts) ────────────────────
    let userQuery = await db.collection('users')
      .where('username', '==', rawIdentifier)
      .get();

    if (userQuery.empty && lowerIdentifier !== rawIdentifier) {
      userQuery = await db.collection('users')
        .where('username', '==', lowerIdentifier)
        .get();
    }

    let userDoc = userQuery.docs.find(doc => doc.data().isDeleted !== true);
    if (!userDoc && !userQuery.empty) {
      userDoc = userQuery.docs[0];
    }

    if (userDoc) {
      const userData = userDoc.data();

      if (userData.isDeleted === true) {
        return res.status(401).json({ status: 'error', message: 'User account has been deleted' });
      }

      // Support both bcrypt hashed and legacy plaintext passwords
      let passwordMatch = false;
      if (userData.passwordHash) {
        passwordMatch = await bcrypt.compare(password, userData.passwordHash);
      } else if (userData.password) {
        // Legacy plaintext — accept but upgrade to hash silently
        passwordMatch = userData.password === password;
        if (passwordMatch) {
          const hash = await bcrypt.hash(password, 12);
          await userDoc.ref.update({ passwordHash: hash, password: null });
        }
      }

      if (!passwordMatch) {
        return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      }

      let batchName = userData.batch || '';
      if (userData.studentId) {
        try {
          const sDoc = await db.collection('students').doc(userData.studentId).get();
          if (sDoc.exists) {
            batchName = sDoc.data()?.batch || '';
          }
        } catch (err) {}
      }

      const role = userData.role || 'student';
      const tenantId = userData.tenantId || 'default_tenant';
      const session = await SessionService.create(userDoc.id, tenantId, role, device);

      const token = issueAccessToken({
        userId: userDoc.id,
        email: userData.email || '',
        name: userData.name || userData.username || '',
        role,
        tenantId,
        studentId: userData.studentId || null,
        username: userData.username || '',
        batch: batchName,
        sessionId: session.sessionId,
      });

      setRefreshTokenCookie(res, session.refreshToken, session.expiresAt);

      return res.status(200).json({
        status: 'success',
        data: {
          token,
          refreshToken: session.refreshToken,
          sessionId: session.sessionId,
          expiresIn: '900',
          userId: userDoc.id,
          localId: userDoc.id,
          role,
          name: userData.name || userData.username || '',
          email: userData.email || '',
          studentId: userData.studentId || null,
          username: userData.username || '',
          batch: batchName,
        },
      });
    }

    // ── 3. Check students collection directly (loginUsername / rollNumber) ───────
    let studentQuery = await db.collection('students')
      .where('loginUsername', '==', rawIdentifier)
      .get();

    if (studentQuery.empty) {
      studentQuery = await db.collection('students')
        .where('rollNumber', '==', rawIdentifier)
        .get();
    }

    if (studentQuery.empty && lowerIdentifier !== rawIdentifier) {
      studentQuery = await db.collection('students')
        .where('loginUsername', '==', lowerIdentifier)
        .get();
      if (studentQuery.empty) {
        studentQuery = await db.collection('students')
          .where('rollNumber', '==', lowerIdentifier)
          .get();
      }
    }

    let studentDoc = studentQuery.docs.find(doc => doc.data().isDeleted !== true);
    if (!studentDoc && !studentQuery.empty) {
      studentDoc = studentQuery.docs[0];
    }

    if (studentDoc) {
      const studentData = studentDoc.data();

      if (studentData.isDeleted === true) {
        return res.status(401).json({ status: 'error', message: 'User account has been deleted' });
      }

      // Support both bcrypt hashed and legacy plaintext passwords
      let passwordMatch = false;
      if (studentData.passwordHash) {
        passwordMatch = await bcrypt.compare(password, studentData.passwordHash);
      } else if (studentData.loginPassword) {
        // Legacy plaintext — accept but upgrade to hash silently
        passwordMatch = studentData.loginPassword === password;
        if (passwordMatch) {
          const hash = await bcrypt.hash(password, 12);
          await studentDoc.ref.update({ passwordHash: hash, loginPassword: null });
        }
      }

      if (!passwordMatch) {
        return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
      }

      const batchName = studentData.batch || '';
      const tenantId = 'default_tenant';
      const session = await SessionService.create(studentDoc.id, tenantId, 'student', device);

      const name = studentData.firstName && studentData.lastName
        ? `${studentData.firstName} ${studentData.lastName}`
        : studentData.loginUsername || studentData.rollNumber || 'Student';

      const token = issueAccessToken({
        userId: studentDoc.id,
        email: studentData.email || '',
        name,
        role: 'student',
        tenantId,
        studentId: studentDoc.id,
        username: studentData.loginUsername || studentData.rollNumber || '',
        batch: batchName,
        sessionId: session.sessionId,
      });

      setRefreshTokenCookie(res, session.refreshToken, session.expiresAt);

      return res.status(200).json({
        status: 'success',
        data: {
          token,
          refreshToken: session.refreshToken,
          sessionId: session.sessionId,
          expiresIn: '900',
          userId: studentDoc.id,
          localId: studentDoc.id,
          role: 'student',
          name,
          email: studentData.email || '',
          studentId: studentDoc.id,
          username: studentData.loginUsername || studentData.rollNumber || '',
          batch: batchName,
        },
      });
    }

    // ── 4. Nothing found ─────────────────────────────────────────────────────────
    return res.status(401).json({ status: 'error', message: 'Invalid username or password' });

  } catch (error: any) {
    next(error);
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Accept refresh token from either httpOnly cookie (web) or request body (mobile)
    const incomingRefreshToken = req.cookies?.nermai_rt || req.body?.refreshToken;
    const sessionId = req.body?.sessionId;

    if (!incomingRefreshToken || !sessionId) {
      return res.status(401).json({ status: 'error', message: 'Refresh token and sessionId required' });
    }

    const result = await SessionService.rotate(sessionId, incomingRefreshToken);

    if (!result) {
      // Clear the cookie on failure (possible token theft)
      res.clearCookie('nermai_rt', { path: '/api/auth' });
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
    }

    const { session } = result;

    // Issue new access token
    const token = issueAccessToken({
      userId: session.userId,
      role: session.role,
      tenantId: session.tenantId,
      sessionId: session.sessionId,
    });

    // Update the httpOnly cookie for web
    setRefreshTokenCookie(res, result.refreshToken, result.expiresAt);

    return res.status(200).json({
      status: 'success',
      data: {
        token,
        refreshToken: result.refreshToken, // For mobile clients
        sessionId,
        expiresIn: '900',
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── LOGOUT (revoke current session) ─────────────────────────────────────────

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    // sessionId is embedded in the JWT by the login handler
    const sessionId = (req.user as any).sessionId || req.body?.sessionId;

    if (sessionId) {
      await SessionService.revoke(sessionId, 'LOGOUT');
    }

    // Clear web cookie
    res.clearCookie('nermai_rt', { path: '/api/auth' });

    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error: any) {
    next(error);
  }
};

// ─── LOGOUT ALL ───────────────────────────────────────────────────────────────

export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const count = await SessionService.revokeAll(req.user.userId, 'LOGOUT_ALL');
    res.clearCookie('nermai_rt', { path: '/api/auth' });

    return res.status(200).json({
      status: 'success',
      message: `Logged out from ${count} session(s)`,
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── LIST ACTIVE SESSIONS ─────────────────────────────────────────────────────

export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const sessions = await SessionService.listActiveSessions(req.user.userId);

    return res.status(200).json({
      status: 'success',
      data: sessions.map(s => ({
        sessionId: s.sessionId,
        platform: s.platform,
        os: s.os,
        ip: s.ip,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt,
        // Never return: refreshTokenHash, userId (caller already knows it)
      })),
    });
  } catch (error: any) {
    next(error);
  }
};

// ─── REVOKE SPECIFIC SESSION ──────────────────────────────────────────────────

export const revokeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ status: 'error', message: 'sessionId required' });
    }

    // Verify the session belongs to the requesting user (ownership check)
    const sessions = await SessionService.listActiveSessions(req.user.userId);
    const sessionBelongsToUser = sessions.some(s => s.sessionId === sessionId);

    if (!sessionBelongsToUser) {
      // Don't reveal whether the session exists — just 403
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    await SessionService.revoke(sessionId, 'USER_REVOKED');

    return res.status(200).json({ status: 'success', message: 'Session revoked' });
  } catch (error: any) {
    next(error);
  }
};

// ─── GET FIREBASE TOKEN ───────────────────────────────────────────────────────

export const getFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const customToken = await auth.createCustomToken(user.userId, {
      role: user.role || 'student',
      tenantId: user.tenantId || 'default_tenant',
    });

    res.status(200).json({
      status: 'success',
      data: { token: customToken },
    });
  } catch (error: any) {
    next(error);
  }
};
