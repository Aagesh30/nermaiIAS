import cluster from "cluster";
import os from "os";
import app from "./app";
import { seedSuperAdmin } from "./scripts/seed-admin";

const PORT = Number(process.env.PORT) || 5000;
// Cluster mode enabled explicitly or in production mode
const isClusterEnabled = process.env.CLUSTER_ENABLED === "true" || (process.env.NODE_ENV === "production" && process.env.CLUSTER_ENABLED !== "false");
const numCPUs = Math.min(os.cpus().length || 1, Number(process.env.MAX_WORKERS) || 8);

if (isClusterEnabled && cluster.isPrimary) {
    console.log(`==================================================`);
    console.log(`  🚀 Nermai Academy Load-Balanced Primary Manager`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  CPU Cores Available: ${os.cpus().length}`);
    console.log(`  Forking ${numCPUs} Worker Instances...`);
    console.log(`==================================================`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.warn(`[Cluster Alert] Worker ${worker.process.pid} exited (Signal: ${signal || code}). Respawning worker...`);
        cluster.fork();
    });

} else {
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
    } catch (err: any) {
        console.error("⚠️ Background services initialization error:", err.message || err);
    }

    const server = app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`  ✅ Nermai Academy Backend Running`);
        console.log(`  URL: http://localhost:${PORT}`);
        console.log(`  PID: ${process.pid}`);
        console.log(`==================================================`);
    });

    process.on("SIGTERM", () => {
        console.log(`[Worker ${process.pid}] SIGTERM received. Closing HTTP server...`);
        server.close(() => {
            console.log(`[Worker ${process.pid}] Server closed.`);
            process.exit(0);
        });
    });
}
