const test = async () => {
  try {
    const res = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@nermai.com',
        password: 'nermaiadmin@unistrix'
      })
    });
    
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
  } catch (err) {
    console.error('Error:', err);
  }
};
test();
