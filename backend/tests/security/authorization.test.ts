/**
 * NERMAI Security Test Suite — Authorization & RBAC
 * 
 * Verifies role enforcement, privilege separation, and tenant/ownership isolation.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

function makeToken(payload: { userId: string; role: string; tenantId?: string; studentId?: string }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      tenantId: payload.tenantId || 'default_tenant',
      studentId: payload.studentId || null,
      isAdmin: payload.role === 'super_admin' || payload.role === 'admin',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Authorization & RBAC Security Tests', () => {
  const studentToken = makeToken({ userId: 'student_123', role: 'student', studentId: 'student_123' });
  const teacherToken = makeToken({ userId: 'teacher_456', role: 'teacher' });
  const adminToken = makeToken({ userId: 'admin_789', role: 'admin' });

  // ── 1. Student Accessing Admin/Staff Endpoints (Must Return 403) ──────────────
  describe('Role Isolation: Student cannot access Privileged Routes', () => {
    const privilegedRoutes = [
      { method: 'get', path: '/api/developer/collections' },
      { method: 'get', path: '/api/erp/student' },
      { method: 'post', path: '/api/erp/student' },
      { method: 'get', path: '/api/erp/fees/payments' },
      { method: 'post', path: '/api/erp/fees/structure' },
      { method: 'get', path: '/api/test-portal/question-bank' },
      { method: 'post', path: '/api/test-portal/test-creation' },
      { method: 'post', path: '/api/live-sessions/create' },
      { method: 'post', path: '/api/live-attendance/staff/start' },
    ];

    privilegedRoutes.forEach(({ method, path }) => {
      it(`Student token on ${method.toUpperCase()} ${path} → 403 Forbidden`, async () => {
        const res = await (request(TEST_URL) as any)[method](path)
          .set('Authorization', `Bearer ${studentToken}`);
        expect(res.status).toBe(403);
      });
    });
  });

  // ── 2. Teacher Accessing Super Admin Developer Routes (Must Return 403) ───────
  describe('Role Isolation: Teacher cannot access Developer or Fee Structures', () => {
    it('Teacher token on GET /api/developer/collections → 403 Forbidden', async () => {
      const res = await request(TEST_URL)
        .get('/api/developer/collections')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    it('Teacher token on POST /api/developer/collection/students → 403 Forbidden', async () => {
      const res = await request(TEST_URL)
        .post('/api/developer/collection/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ name: 'test' });
      expect(res.status).toBe(403);
    });
  });

  // ── 3. Role Escalation via Headers ───────────────────────────────────────────
  describe('Zero Trust: Role Escalation via Header Forgery is Blocked', () => {
    it('Student JWT with x-is-admin: true header on developer routes → 403 Forbidden', async () => {
      const res = await request(TEST_URL)
        .get('/api/developer/collections')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-is-admin', 'true')
        .set('user-role', 'super_admin');
      expect(res.status).toBe(403);
    });

    it('Student JWT with x-student-id: admin_target on ERP fees → 403 Forbidden', async () => {
      const res = await request(TEST_URL)
        .get('/api/erp/fees/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-student-id', 'admin_target');
      expect(res.status).toBe(403);
    });
  });
});
