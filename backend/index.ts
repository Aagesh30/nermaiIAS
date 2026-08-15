import { onRequest } from "firebase-functions/v2/https";
import app from "./app";

/**
 * Main Firebase Cloud Functions Entry Point
 * Exports Express app with v2 Cloud Functions configuration for region asia-south1.
 */
export const api = onRequest({ region: "asia-south1", timeoutSeconds: 300, memory: "1GiB" }, app);
export default app;

