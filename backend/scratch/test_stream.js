const axios = require('axios');
const jwt = require('jsonwebtoken');

// Load environment variables
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const JWT_SECRET = process.env.JWT_SECRET || '37a935bf793c5d6c97a82e987c2fb24a';
const API_BASE = 'https://nermaiiasacademy-519c8.web.app/api'; // or direct cloud function URL: https://api-adx6p2kdta-el.a.run.app

async function main() {
  const resourceId = 'huSF9zTqTiLaJgXldkOy'; // vaw
  const userId = 'super_admin_root';
  const tenantId = 'default_tenant';

  console.log("Generating viewer token...");
  const token = jwt.sign(
    { 
      userId, 
      tenantId, 
      resourceId,
    },
    JWT_SECRET,
    { expiresIn: '900s' }
  );

  const streamUrl = `${API_BASE}/resources/${resourceId}/secure-stream?token=${token}`;
  console.log(`Requesting secure-stream: ${streamUrl}`);
  
  try {
    const res = await axios.get(streamUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept-Ranges': 'bytes'
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    console.log(`Downloaded: ${res.data.byteLength} bytes`);
  } catch (error) {
    if (error.response) {
      console.error(`Request failed with status ${error.response.status}`);
      const body = Buffer.from(error.response.data).toString('utf8');
      console.error("Response body:", body);
    } else {
      console.error("Request failed:", error.message);
    }
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
