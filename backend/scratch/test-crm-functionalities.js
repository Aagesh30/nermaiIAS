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

  console.log('--- ADMIN SIDE CRM ENDPOINTS AUDIT ---');

  // 1. Get Admissions
  const getAdmissions = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/admission', { headers: adminHeaders });
  console.log('GET /crm/admission:', getAdmissions.status);

  // 2. Get Leads
  const getLeads = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/leads', { headers: adminHeaders });
  console.log('GET /crm/leads:', getLeads.status);

  // 3. Get Campaigns Admin
  const getCampaigns = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/campaigns/admin', { headers: adminHeaders });
  console.log('GET /crm/campaigns/admin:', getCampaigns.status);

  // 4. Get Feedbacks
  const getFeedback = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/alumni-feedback', { headers: adminHeaders });
  console.log('GET /crm/alumni-feedback:', getFeedback.status);

  // 5. Get Inquiries
  const getInquiries = await fetch('https://nermaiiasacademy-519c8.web.app/api/crm/inquiry', { headers: adminHeaders });
  console.log('GET /crm/inquiry:', getInquiries.status);
};
test().catch(console.error);
