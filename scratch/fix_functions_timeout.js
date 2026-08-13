const fs = require('fs');

console.log("Moving background services to server.ts to prevent Firebase CLI timeout...");

// 1. Modify backend/app.ts
const appPath = 'backend/app.ts';
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/\r\n/g, '\n');

const targetAppImports = `import zlib from "zlib";
import { ProviderRegistry } from "./modules/live-sessions/providers/ProviderRegistry";
import { ZoomProvider } from "./modules/live-sessions/providers/ZoomProvider";
import { YouTubeProvider } from "./modules/live-sessions/providers/YouTubeProvider";
import { LiveSyncService } from "./services/liveSync.service";
import { startPersistenceDrainer } from "./modules/interaction-engine/worker";
import { attendanceAnalyticsWorker } from "./modules/analytics/attendance.worker";

try {
  ProviderRegistry.registerProvider("zoom", new ZoomProvider());
  ProviderRegistry.registerProvider("youtube", new YouTubeProvider());
  LiveSyncService.getInstance().init();
  startPersistenceDrainer();
  attendanceAnalyticsWorker.start();
  console.log("✅ Live providers, LiveSyncService, Interaction drainer, and Attendance analytics worker initialized.");
} catch (err: any) {
  console.error("⚠️ Background services initialization error:", err.message || err);
}`;

const replacementAppImports = `import zlib from "zlib";`;

if (appContent.indexOf(targetAppImports) === -1) {
  console.error("ERROR: targetAppImports not found in app.ts!");
  process.exit(1);
}
appContent = appContent.split(targetAppImports).join(replacementAppImports);
fs.writeFileSync(appPath, appContent, 'utf8');
console.log("- Successfully updated backend/app.ts");


// 2. Modify backend/server.ts
const serverPath = 'backend/server.ts';
let serverContent = fs.readFileSync(serverPath, 'utf8');
serverContent = serverContent.replace(/\r\n/g, '\n');

const targetServerContent = `} else {
    // Seed the default super_admin in Firestore on startup
    seedSuperAdmin();

    const server = app.listen(PORT, () => {`;

const replacementServerContent = `} else {
    // Seed the default super_admin in Firestore on startup
    seedSuperAdmin();

    // Start background services in standalone server mode
    try {
        const { ProviderRegistry } = require("./modules/live-sessions/providers/ProviderRegistry");
        const { ZoomProvider } = require("./modules/live-sessions/providers/ZoomProvider");
        const { YouTubeProvider } = require("./modules/live-sessions/providers/YouTubeProvider");
        const { LiveSyncService } = require("./services/liveSync.service");
        const { startPersistenceDrainer } = require("./modules/interaction-engine/worker");
        const { attendanceAnalyticsWorker } = require("./modules/analytics/attendance.worker");

        ProviderRegistry.registerProvider("zoom", new ZoomProvider());
        ProviderRegistry.registerProvider("youtube", new YouTubeProvider());
        LiveSyncService.getInstance().init();
        startPersistenceDrainer();
        attendanceAnalyticsWorker.start();
        console.log("✅ Live providers, LiveSyncService, Interaction drainer, and Attendance analytics worker initialized.");
    } catch (err) {
        console.error("⚠️ Background services initialization error:", err.message || err);
    }

    const server = app.listen(PORT, () => {`;

if (serverContent.indexOf(targetServerContent) === -1) {
  console.error("ERROR: targetServerContent not found in server.ts!");
  process.exit(1);
}
serverContent = serverContent.split(targetServerContent).join(replacementServerContent);
fs.writeFileSync(serverPath, serverContent, 'utf8');
console.log("- Successfully updated backend/server.ts");

console.log("Done!");
