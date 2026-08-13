/**
 * NERMAI Security Regression Tests — Phase 1
 * 
 * Tests the 19 critical bypass vectors identified in the security prequalification audit.
 * Run: npx jest tests/security/auth-bypass.test.ts
 * 
 * These tests ensure security controls are not accidentally removed in future changes.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';

// Import the app (adjust path if needed)
const app = require('../../src/app').default || require('../../src/app');

const TEST_URL = process.env.TEST_URL || 'http://localhost:5000';

// Helper to create a forged JWT with a WRONG secret
function forgeJwt(payload: object = {}, secret = 'wrong-secret'): string {
  return jwt.sign({
    userId: 'forged-user-id',
    role: 'super_admin',
    ...payload,
  }, secret, { expiresIn: '1h' });
}

// Helper to create an expired JWT
function expiredJwt(): string {
  return jwt.sign({
    userId: 'some-user',
    role: 'super_admin',
  }, process.env.JWT_SECRET || 'supersecret123', { expiresIn: '-1s' });
}

describe('Security Regression Tests', () => {

  // ── CV-1 & CV-2: DEV Token Bypasses ─────────────────────────────────────────
  describe('CV-1/CV-2: DEV token bypass (must return 401)', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/erp/student' },
      { method: 'get', path: '/api/developer/collections' },
      { method: 'get', path: '/api/test-portal/question-bank' },
      { method: 'get', path: '/api/test-portal/test-creation' },
      { method: 'get', path: '/api/erp/fees/payments' },
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`DEV_ADMIN_TOKEN on ${method.toUpperCase()} ${path} → 401`, async () => {
        const res = await (request(TEST_URL) as any)[method](path)
          .set('Authorization', 'Bearer DEV_ADMIN_TOKEN');
        expect(res.status).toBe(401);
      });

      it(`DEV_STUDENT_TOKEN on ${method.toUpperCase()} ${path} → 401`, async () => {
        const res = await (request(TEST_URL) as any)[method](path)
          .set('Authorization', 'Bearer DEV_STUDENT_TOKEN');
        expect(res.status).toBe(401);
      });
    });
  });

  // ── No Token ─────────────────────────────────────────────────────────────────
  describe('No token (must return 401)', () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/erp/student' },
      { method: 'get', path: '/api/developer/collections' },
      { method: 'get', path: '/api/test-portal/question-bank' },
      { method: 'get', path: '/api/test-portal/test-creation' },
      { method: 'post', path: '/api/test-portal/test-creation/extract' },
      { method: 'get', path: '/api/test-portal/evaluation/test/fake-test-id' },
      { method: 'post', path: '/api/test-portal/evaluation/recalculate/fake-attempt' },
      { method: 'delete', path: '/api/test-portal/evaluation/result/fake-result' },
      { method: 'get', path: '/api/erp/fees/payments' },
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`No token on ${method.toUpperCase()} ${path} → 401`, async () => {
        const res = await (request(TEST_URL) as any)[method](path);
        expect(res.status).toBe(401);
      });
    });
  });

  // ── CV-3: Malformed JWT ───────────────────────────────────────────────────────
  describe('CV-3: Malformed JWT (must return 401)', () => {
    it('Malformed JWT → 401', async () => {
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('Authorization', 'Bearer not.a.valid.jwt');
      expect(res.status).toBe(401);
    });

    it('Plain string (not JWT) → 401', async () => {
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('Authorization', 'Bearer randomstring');
      expect(res.status).toBe(401);
    });
  });

  // ── CV-4: Forged JWT with wrong secret ──────────────────────────────────────
  describe('CV-4: Forged JWT with wrong secret (must return 401)', () => {
    it('JWT signed with wrong secret → 401', async () => {
      const token = forgeJwt({ userId: 'hacker', role: 'super_admin' }, 'wrong-secret');
      const res = await request(TEST_URL)
        .get('/api/developer/collections')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('JWT signed with known compromised secret supersecret123 → 401', async () => {
      const token = forgeJwt({ userId: 'hacker', role: 'super_admin' }, 'supersecret123');
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('JWT signed with mock-secret → 401', async () => {
      const token = forgeJwt({ userId: 'hacker', role: 'super_admin' }, 'mock-secret');
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  // ── CV-5: Expired JWT ─────────────────────────────────────────────────────────
  describe('CV-5: Expired JWT (must return 401)', () => {
    it('Expired JWT → 401 (not accepted)', async () => {
      const token = expiredJwt();
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  // ── CV-6: alg:none JWT ────────────────────────────────────────────────────────
  describe('CV-6: alg:none JWT (must return 401)', () => {
    it('alg:none JWT → 401', async () => {
      // Build a "none" algorithm JWT manually
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'super_admin', iat: Math.floor(Date.now() / 1000) })).toString('base64url');
      const noneToken = `${header}.${payload}.`;
      const res = await request(TEST_URL)
        .get('/api/developer/collections')
        .set('Authorization', `Bearer ${noneToken}`);
      expect(res.status).toBe(401);
    });
  });

  // ── CV-7: Guest header spoofing ───────────────────────────────────────────────
  describe('CV-7/CV-8/CV-9: Client header identity spoofing (must return 401)', () => {
    it('user-role: super_admin header without token → 401', async () => {
      const res = await request(TEST_URL)
        .get('/api/erp/student')
        .set('user-role', 'super_admin')
        .set('user-id', 'spoofed-user');
      expect(res.status).toBe(401);
    });

    it('x-is-admin: true header without token → 401', async () => {
      const res = await request(TEST_URL)
        .get('/api/developer/collections')
        .set('x-is-admin', 'true');
      expect(res.status).toBe(401);
    });
  });

  // ── CV-12: Student accessing question bank (answer keys) ─────────────────────
  describe('CV-12: Student accessing question bank → 403', () => {
    it('Valid student JWT on GET /api/test-portal/question-bank → 403', async () => {
      // Create a student JWT with the REAL secret
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.warn('JWT_SECRET not set — skipping student question bank test');
        return;
      }
      const studentToken = jwt.sign(
        { userId: 'test-student-id', role: 'student', tenantId: 'default_tenant' },
        jwtSecret,
        { expiresIn: '1h' }
      );
      const res = await request(TEST_URL)
        .get('/api/test-portal/question-bank')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── CV-13: Developer portal unauthenticated ────────────────────────────────────
  describe('CV-13: Developer portal (must return 401)', () => {
    it('GET /api/developer/collections without token → 401', async () => {
      const res = await request(TEST_URL).get('/api/developer/collections');
      expect(res.status).toBe(401);
    });

    it('POST /api/developer/collection/students without token → 401', async () => {
      const res = await request(TEST_URL)
        .post('/api/developer/collection/students')
        .send({ firstName: 'Hacker', loginPassword: 'hack123' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/developer/collection/students without token → 401', async () => {
      const res = await request(TEST_URL)
        .delete('/api/developer/collection/students');
      expect(res.status).toBe(401);
    });
  });

  // ── CV-19: Debug delay cap ─────────────────────────────────────────────────────
  describe('CV-17: Debug delay capped at 5000ms', () => {
    it('Debug delay with ?ms=60000 completes within 6 seconds (capped at 5000)', async () => {
      const start = Date.now();
      await request(TEST_URL)
        .post('/api/debug/fault/firebase-delay?ms=60000')
        .timeout(7000)
        .catch(() => {}); // timeout is OK
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(6000);
    }, 8000);
  });

});
