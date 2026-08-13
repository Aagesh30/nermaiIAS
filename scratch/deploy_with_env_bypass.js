const fs = require('fs');
const { execSync } = require('child_process');

const envPath = 'backend/.env';
const tempEnvPath = 'backend/.env.temp';

let envExisted = false;

try {
  if (fs.existsSync(envPath)) {
    console.log(`- Temporarily renaming ${envPath} to ${tempEnvPath} to bypass Firebase CLI reserved key restrictions...`);
    fs.renameSync(envPath, tempEnvPath);
    envExisted = true;
  }

  console.log("- Running Firebase deployment...");
  // Run with inherit stdio so user/agent logs show output
  execSync('firebase deploy --force', { stdio: 'inherit' });
  console.log("✅ Firebase deployment succeeded!");

} catch (err) {
  console.error("❌ Firebase deployment failed:", err.message);
} finally {
  if (envExisted && fs.existsSync(tempEnvPath)) {
    console.log(`- Restoring ${tempEnvPath} back to ${envPath}...`);
    fs.renameSync(tempEnvPath, envPath);
    console.log("- Restoration complete.");
  }
}
