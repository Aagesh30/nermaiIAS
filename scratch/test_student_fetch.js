const fetch = require('node-fetch'); // wait, if node-fetch is not installed, we can use global fetch in Node 18+

async function run() {
  const baseUrl = 'https://us-central1-nermaiiasacademy-519c8.cloudfunctions.net/api';
  console.log("1. Logging in as admin...");
  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin@nermai.com', password: 'nermaiadmin@unistrix' })
    });
    console.log("Login HTTP Status:", loginRes.status);
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error("Login failed:", loginData);
      return;
    }
    const token = loginData.token || (loginData.data && loginData.data.token) || loginData.data?.sessionToken || loginData.sessionToken;
    console.log("Login Success! Token extracted:", token ? (token.substring(0, 15) + "...") : "null");
    console.log("User data role:", loginData.role || loginData.data?.role);

    console.log("\n2. Fetching students list...");
    const studentRes = await fetch(`${baseUrl}/erp/student`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Student fetch HTTP Status:", studentRes.status);
    const studentData = await studentRes.json();
    console.log("Student fetch response body (truncated):", JSON.stringify(studentData).substring(0, 500));
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

run();
