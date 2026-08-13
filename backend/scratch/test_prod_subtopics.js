const axios = require('axios');

const PROD_URL = 'https://nermaiiasacademy-519c8.web.app/api';

async function testApi(baseUrl, label) {
  console.log(`\n=== Testing ${label} API (${baseUrl}) ===`);
  try {
    // 1. Login
    console.log('Logging in as JD007...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      username: 'JD007',
      password: 'JD007'
    });
    
    const token = loginRes.data?.data?.token;
    if (!token) {
      console.error('Failed to get token:', loginRes.data);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch subtopics
    console.log('Fetching subtopics...');
    const subtopicsRes = await axios.get(`${baseUrl}/subtopics`, { headers });
    console.log(`Subtopics status: ${subtopicsRes.status}, data count:`, Array.isArray(subtopicsRes.data?.data) ? subtopicsRes.data.data.length : subtopicsRes.data);
    if (subtopicsRes.data?.data) {
      console.log('Subtopics data:', JSON.stringify(subtopicsRes.data.data, null, 2));
    }
  } catch (err) {
    console.error('API Error:', err.response ? {
      status: err.response.status,
      data: err.response.data
    } : err.message);
  }
}

testApi(PROD_URL, 'Production');
