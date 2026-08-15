const test = async () => {
  try {
    // 1. Login as JD007
    const loginRes = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'JD007',
        password: 'JD007' // Wait, what is the password of JD007?
      })
    });
    
    console.log('Login Status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login Data:', loginData);
    
    if (!loginData.data?.token) {
      console.log('Login failed!');
      return;
    }
    
    const token = loginData.data.token;
    
    // 2. Fetch /api/erp/staff/profile/me
    const profileRes = await fetch('https://nermaiiasacademy-519c8.web.app/api/erp/staff/profile/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Profile Status:', profileRes.status);
    console.log('Profile Body:', await profileRes.json());
  } catch (err) {
    console.error('Error:', err);
  }
};
test();
