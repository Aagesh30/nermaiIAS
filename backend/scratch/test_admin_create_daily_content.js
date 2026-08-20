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
    
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.data || !loginData.data.token) {
      console.error('Failed to log in!');
      return;
    }
    
    const token = loginData.data.token;
    
    console.log('\nSubmitting daily content creation request for approval...');
    const requestPayload = {
      type: "create_approval",
      feature: "daily_content",
      targetCollection: "dailyContent",
      docId: "new_document",
      proposedPayload: {
        title: "Test Daily Study Material",
        date: "2026-08-19",
        type: "pdf",
        source: "url",
        url: "https://drive.google.com/test",
        targetAudience: "all",
        description: "Test description for RBAC",
        createdBy: "admin007"
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
      console.log('🎉 Success! The daily content request went through perfectly!');
    } else {
      console.error('❌ Failed! Status code is not 201.');
    }
  } catch (err) {
    console.error('Error during test:', err);
  }
};

test();
