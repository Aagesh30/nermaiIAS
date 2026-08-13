import { z } from 'zod';
import dotenv from 'dotenv';

import * as path from "path";
import * as fs from "fs";

const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, "../.env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  dotenv.config();
}

// ─── Security: fail-fast on missing or weak secrets in production ─────────────
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const jwtSecret = process.env.JWT_SECRET || '';
  const aesKey = process.env.AES_SECRET_KEY || '';

  if (!jwtSecret || jwtSecret.length < 32) {
    console.error('❌ SECURITY FATAL: JWT_SECRET is missing or too short (minimum 32 characters). Server will not start.');
    process.exit(1);
  }
  if (!aesKey || aesKey.length < 32) {
    console.error('❌ SECURITY FATAL: AES_SECRET_KEY is missing or too short (minimum 32 characters). Server will not start.');
    process.exit(1);
  }
}

// ─── Environment schema ────────────────────────────────────────────────────────
const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FIREBASE_PROJECT_ID: z.string().default('nermaiiasacademy-519c8'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be a valid email').optional().or(z.literal('')),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  DRIVE_CLIENT_EMAIL: z.string().email('DRIVE_CLIENT_EMAIL must be a valid email').optional().or(z.literal('')),
  DRIVE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  // JWT_SECRET: required; no insecure default. Local dev must have this in .env.
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  // AES_SECRET_KEY: required; no insecure default.
  AES_SECRET_KEY: z.string().min(1, 'AES_SECRET_KEY is required'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional().or(z.literal('')),
  REDIS_REQUIRED: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  FCM_SERVER_KEY: z.string().optional(),
  FIREBASE_API_KEY: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:8081,http://localhost:3000'),
  WATCH_PROGRESS_INTERVAL: z.coerce.number().default(90),
  ATTENDANCE_HEARTBEAT_INTERVAL: z.coerce.number().default(300),
  VIDEO_COMPLETION_PERCENT: z.coerce.number().default(95),
  ATTENDANCE_MIN_PERCENTAGE: z.coerce.number().default(50),
  ZOOM_SDK_KEY: z.string().optional(),
  ZOOM_SDK_SECRET: z.string().optional(),
  ZOOM_ACCOUNT_ID: z.string().optional(),
  ZOOM_OAUTH_CLIENT_ID: z.string().optional(),
  ZOOM_OAUTH_CLIENT_SECRET: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
