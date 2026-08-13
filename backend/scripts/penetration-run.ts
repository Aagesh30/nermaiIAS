import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const TEST_URL = process.env.TEST_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

function makeToken(userId: string, role: string, tenantId = 'default_tenant', extra = {}): string {
  return jwt.sign(
    { userId, role, tenantId, studentId: userId, ...extra },
    JWT_SECRET,
    { expiresIn: '10m' }
  );
}

const studentToken = makeToken('student_alice', 'student');
const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const nonePayload = Buffer.from(JSON.stringify({ userId: 'hacker', role: 'super_admin' })).toString('base64url');
const noneToken = `${noneHeader}.${nonePayload}.`;

interface AttackResult {
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes?: string;
}

const attacks = [
  {
    name: 'DEV_ADMIN_TOKEN Bypass',
    url: '/api/developer/collections',
    method: 'GET',
    headers: { 'Authorization': 'Bearer DEV_ADMIN_TOKEN' },
    expectedStatus: 401,
  },
  {
    name: 'DEV_STUDENT_TOKEN Bypass',
    url: '/api/erp/student',
    method: 'GET',
    headers: { 'Authorization': 'Bearer DEV_STUDENT_TOKEN' },
    expectedStatus: 401,
  },
  {
    name: 'Client Header Identity Spoofing',
    url: '/api/developer/collections',
    method: 'GET',
    headers: { 'user-role': 'super_admin', 'x-is-admin': 'true' },
    expectedStatus: 401,
  },
  {
    name: 'Algorithm none JWT Attack',
    url: '/api/developer/collections',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${noneToken}` },
    expectedStatus: 401,
  },
  {
    name: 'Student Accessing Developer Collections',
    url: '/api/developer/collections',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    expectedStatus: 403,
  },
  {
    name: 'Student Accessing Question Bank',
    url: '/api/test-portal/question-bank',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    expectedStatus: 403,
  },
  {
    name: 'Student Accessing ERP Student Directory',
    url: '/api/erp/student',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    expectedStatus: 403,
  },
  {
    name: 'Cross-User Tampering (Accessing Bob\'s Fees)',
    url: '/api/erp/fees/student/student_bob',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    expectedStatus: 403,
  },
  {
    name: 'Cross-Tenant Header Injection Bypass',
    url: '/api/erp/fees/student/student_bob',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}`, 'x-target-tenant': 'other_tenant' },
    expectedStatus: 403,
  },
  {
    name: 'Tampering other Student Exam Attempt',
    url: '/api/test-portal/examination/resume/attempt_bob_123',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` },
    expectedStatus: 403, // Will be checked specifically to allow 403 or 404
  },
];

async function runPenetrationSuite() {
  console.log('==================================================');
  console.log('⚡ NERMAI SECURE PENETRATION & ATTACK SIMULATOR ⚡');
  console.log(`Target: ${TEST_URL}`);
  console.log('==================================================\n');

  const results: AttackResult[] = [];

  for (const attack of attacks) {
    try {
      const response = await fetch(`${TEST_URL}${attack.url}`, {
        method: attack.method,
        headers: attack.headers as any,
      });

      const actualStatus = response.status;
      let passed = actualStatus === attack.expectedStatus;
      if (attack.name === 'Tampering other Student Exam Attempt' && (actualStatus === 403 || actualStatus === 404)) {
        passed = true;
      }

      results.push({
        name: attack.name,
        url: attack.url,
        method: attack.method,
        expectedStatus: attack.expectedStatus,
        actualStatus,
        passed,
      });
    } catch (err: any) {
      results.push({
        name: attack.name,
        url: attack.url,
        method: attack.method,
        expectedStatus: attack.expectedStatus,
        actualStatus: 0,
        passed: false,
        notes: `Network/Server Error: ${err.message}`,
      });
    }
  }

  // Deduplication test (Double comment post)
  try {
    const payload = { liveSessionId: 'session_123', type: 'COMMENT', text: `Spam comment ${crypto.randomUUID()}` };
    const headers = { 'Authorization': `Bearer ${studentToken}`, 'Content-Type': 'application/json' };
    
    // Attempt 1
    await fetch(`${TEST_URL}/api/live-comments`, {
      method: 'POST',
      headers: headers as any,
      body: JSON.stringify(payload),
    });

    // Attempt 2 immediately after
    const res2 = await fetch(`${TEST_URL}/api/live-comments`, {
      method: 'POST',
      headers: headers as any,
      body: JSON.stringify(payload),
    });

    results.push({
      name: 'Realtime Duplicate Comment Flood',
      url: '/api/live-comments',
      method: 'POST',
      expectedStatus: 429,
      actualStatus: res2.status,
      passed: res2.status === 429,
      notes: res2.status === 429 ? 'Deduplication caught duplicate request' : 'Allowed duplicate',
    });
  } catch (err: any) {
    results.push({
      name: 'Realtime Duplicate Comment Flood',
      url: '/api/live-comments',
      method: 'POST',
      expectedStatus: 429,
      actualStatus: 0,
      passed: false,
      notes: `Network Error: ${err.message}`,
    });
  }

  // Print Report
  console.log('--- PENETRATION ATTACK RESULTS ---');
  let totalPassed = 0;
  results.forEach(res => {
    const statusText = res.passed ? '🛡️ SECURE (Blocked)' : '🚨 VULNERABLE (Bypassed)';
    console.log(`[${statusText}] ${res.name}`);
    console.log(`  Route: ${res.method} ${res.url}`);
    console.log(`  Expected: ${res.expectedStatus} | Actual: ${res.actualStatus}`);
    if (res.notes) console.log(`  Notes: ${res.notes}`);
    console.log('');
    if (res.passed) totalPassed++;
  });

  console.log('==================================================');
  console.log(`Summary: ${totalPassed}/${results.length} attacks successfully blocked.`);
  console.log(totalPassed === results.length ? '✅ SYSTEM SECURITY CONFIRMED: ZERO VULNERABILITIES EXPLOITABLE.' : '❌ SECURITY BREACH: FIXED REQUIRED.');
  console.log('==================================================');
}

runPenetrationSuite();
