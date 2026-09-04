const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const { LiveSessionController } = require('../modules/live-sessions/controller');

// Mock req and res
async function test() {
  const req1 = { params: { id: 'OFF6Tq3gXZybtl2XcPmC' } };
  const res1 = {
    status: (code) => ({
      json: (data) => console.log('Response for OFF6Tq3gXZybtl2XcPmC:', code, JSON.stringify(data, null, 2))
    })
  };
  await LiveSessionController.getAttendance(req1, res1);

  const req2 = { params: { id: 'JzFTmatvJ0T9J8Y4VAWF' } };
  const res2 = {
    status: (code) => ({
      json: (data) => console.log('Response for JzFTmatvJ0T9J8Y4VAWF:', code, JSON.stringify(data, null, 2))
    })
  };
  await LiveSessionController.getAttendance(req2, res2);
}

test().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
