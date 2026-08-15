const test = async () => {
  // Login as admin
  const adminLogin = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@nermai.com', password: 'nermaiadmin@unistrix' })
  });
  const adminData = await adminLogin.json();
  if (!adminData.data?.token) { console.log('Admin login failed:', adminData); return; }
  const token = adminData.data.token;
  const adminHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log('--- ADMIN SIDE TEST PORTAL ENDPOINTS AUDIT ---');

  // 1. Get Tests
  const getTests = await fetch('https://nermaiiasacademy-519c8.web.app/api/test-portal/test-creation', { headers: adminHeaders });
  console.log('GET /test-portal/test-creation:', getTests.status);

  // 2. Get Questions
  const getQuestions = await fetch('https://nermaiiasacademy-519c8.web.app/api/test-portal/question-bank', { headers: adminHeaders });
  console.log('GET /test-portal/question-bank:', getQuestions.status);

  // 3. Get Feedback
  const getFeedback = await fetch('https://nermaiiasacademy-519c8.web.app/api/test-portal/test-creation/feedback', { headers: adminHeaders });
  console.log('GET /test-portal/test-creation/feedback:', getFeedback.status);

  // 4. Get All Test Results
  const getResults = await fetch('https://nermaiiasacademy-519c8.web.app/api/test-portal/review/results/all-tests', { headers: adminHeaders });
  console.log('GET /test-portal/review/results/all-tests:', getResults.status);
};
test().catch(console.error);
