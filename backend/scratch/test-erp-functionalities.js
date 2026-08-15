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

  console.log('--- ADMIN SIDE ENDPOINTS AUDIT ---');

  // 1. Get Students
  const getStudents = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/student', { headers: adminHeaders });
  console.log('GET /erp/student:', getStudents.status);

  // 2. Get Profile Requests
  const getProfileReqs = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/profile-request', { headers: adminHeaders });
  console.log('GET /erp/profile-request:', getProfileReqs.status);

  // 3. Get Staff
  const getStaff = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/staff', { headers: adminHeaders });
  console.log('GET /erp/staff:', getStaff.status);

  // 4. Get Batches
  const getBatches = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/batch', { headers: adminHeaders });
  console.log('GET /erp/batch:', getBatches.status);

  // 5. Get Fees Payments
  const getFees = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/fees/payments', { headers: adminHeaders });
  console.log('GET /erp/fees/payments:', getFees.status);

  // 6. Get SACS pending requests
  const getSacsPending = await fetch('https://nermaiiasacademy-519c8.web.app/api/access-requests/admin/pending', { headers: adminHeaders });
  console.log('GET /access-requests/admin/pending:', getSacsPending.status);

  // 7. Get SACS history
  const getSacsHistory = await fetch('https://nermaiiasacademy-519c8.web.app/api/access-requests/admin/history', { headers: adminHeaders });
  console.log('GET /access-requests/admin/history:', getSacsHistory.status);

  // 8. Get SACS permanent grants
  const getSacsGrants = await fetch('https://nermaiiasacademy-519c8.web.app/api/access-requests/admin/permanent-grants', { headers: adminHeaders });
  console.log('GET /access-requests/admin/permanent-grants:', getSacsGrants.status);

  // 9. Get Admissions
  const getAdmissions = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/admission', { headers: adminHeaders });
  console.log('GET /crm/admission:', getAdmissions.status);

  // 10. Get Leads
  const getLeads = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/leads', { headers: adminHeaders });
  console.log('GET /crm/leads:', getLeads.status);

  // 11. Get Alumni Feedback
  const getFeedback = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/alumni-feedback', { headers: adminHeaders });
  console.log('GET /crm/alumni-feedback:', getFeedback.status);
};
test().catch(console.error);
