const test = async () => {
  const adminLogin = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@nermai.com', password: 'nermaiadmin@unistrix' })
  });
  const adminData = await adminLogin.json();
  if (!adminData.data?.token) { console.log('Admin login failed:', adminData); return; }
  const adminToken = adminData.data.token;

  // Check profile request for Aagesh JD
  const reqRes = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/profile-request/student/ca320ed5-0f96-4b24-8335-52a5006f42b0', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const reqData = await reqRes.json();
  console.log('Profile request for Aagesh JD:', reqData?.data?.status, '| ID:', reqData?.data?.id);

  // Now approve it
  if (reqData?.data?.id) {
    const approveRes = await fetch(`https://nermaiiasacademy-519c8.web.app/api/erp/profile-request/${reqData.data.id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ reviewedBy: 'admin@nermai.com' })
    });
    console.log('Approve Status:', approveRes.status);
    console.log('Approve Response:', JSON.stringify(await approveRes.json(), null, 2));

    // Verify student record updated
    const studRes = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/student/ca320ed5-0f96-4b24-8335-52a5006f42b0', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const studData = await studRes.json();
    const s = studData?.data;
    console.log('\nStudent after approval:');
    console.log('  bloodGroup:', s?.bloodGroup);
    console.log('  gender:', s?.gender);
    console.log('  dob:', s?.dob);
    console.log('  fatherName:', s?.fatherName);
    console.log('  address:', s?.address);
    console.log('  profileComplete:', s?.profileComplete);
  }
};
test().catch(console.error);
