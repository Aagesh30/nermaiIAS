const test = async () => {
  try {
    console.log('Logging in as admin007...');
    const loginRes = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin007',
        password: '007'
      })
    });
    
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    
    if (!loginRes.ok || !loginData.data || !loginData.data.token) {
      console.error('Failed to log in!');
      return;
    }
    
    const token = loginData.data.token;
    
    console.log('\nSubmitting student creation request for approval...');
    const requestPayload = {
      type: "create_approval",
      feature: "student_management",
      targetCollection: "students",
      docId: "new_document",
      proposedPayload: {
        id: "test_student_rbac_id",
        name: "RBAC Test Student",
        rollNumber: "TEST-RBAC-001",
        email: "rbac_test@nermai.com",
        contactDetails: "7896541302"
      },
      requestedBy: "admin007",
      status: "pending",
      createdAt: new Date().toISOString()
    };
    
    const res = await fetch('https://nermaiiasacademy-519c8.web.app/api/developer/collection/notifications', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log('Submit Request Status:', res.status);
    const resData = await res.json();
    console.log('Submit Request Response:', resData);
    
    if (res.status === 201) {
      console.log('🎉 Success! The request went through perfectly!');
    } else {
      console.error('❌ Failed! Status code is not 201.');
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
};

test();
