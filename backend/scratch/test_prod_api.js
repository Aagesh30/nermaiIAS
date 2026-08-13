const axios = require('axios');

const PROD_URL = 'https://nermaiiasacademy-519c8.web.app/api';
const LOCAL_URL = 'http://localhost:5000/api';

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
      console.error('Failed to get token from response:', loginRes.data);
      return;
    }
    console.log('Login successful! Token:', token.substring(0, 30) + '...');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. Fetch courses
    console.log('Fetching courses...');
    const coursesRes = await axios.get(`${baseUrl}/courses`, { headers });
    console.log(`Courses status: ${coursesRes.status}, data count:`, Array.isArray(coursesRes.data?.data) ? coursesRes.data.data.length : coursesRes.data);
    if (coursesRes.data?.data) {
      console.log('Courses:', JSON.stringify(coursesRes.data.data, null, 2));
    }

    // 3. Fetch subjects
    console.log('Fetching subjects...');
    const subjectsRes = await axios.get(`${baseUrl}/subjects`, { headers });
    console.log(`Subjects status: ${subjectsRes.status}, data count:`, Array.isArray(subjectsRes.data?.data) ? subjectsRes.data.data.length : subjectsRes.data);

    // 4. Fetch topics
    console.log('Fetching topics...');
    const topicsRes = await axios.get(`${baseUrl}/topics`, { headers });
    console.log(`Topics status: ${topicsRes.status}, data count:`, Array.isArray(topicsRes.data?.data) ? topicsRes.data.data.length : topicsRes.data);

  } catch (err) {
    console.error('API Error:', err.response ? {
      status: err.response.status,
      data: err.response.data
    } : err.message);
  }
}

async function run() {
  await testApi(PROD_URL, 'Production');
}

run();
