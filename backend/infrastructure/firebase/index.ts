import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getStorage, Storage } from 'firebase-admin/storage';
import { env } from '../../config/env';
import { logger } from '../../core/logger';

// ------------------------------------------------------------------
// Singleton Firebase Admin App
// ------------------------------------------------------------------
// We use a module-level variable instead of exporting the result of
// getFirestore() / getAuth() directly at load time. That pattern breaks
// on tsx hot-reload because the module re-executes BEFORE Firebase can
// reinitialize, giving "There is no configuration for the identifier."
//
// Instead, callers import { db, auth, messaging } which are lazy-getter
// proxies — they initialize Firebase on first access, then cache the
// result for all subsequent calls.
// ------------------------------------------------------------------

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _messaging: Messaging | null = null;
let _storage: Storage | null = null;

function getFirebaseApp(): App {
  if (_app) return _app;

  const existing = getApps();
  if (existing.length > 0) {
    logger.info('Firebase Admin already initialized. Re-using existing app.');
    _app = existing[0];
    return _app;
  }

  // Use the newly created custom dotless bucket as primary.
  const projectId = env.FIREBASE_PROJECT_ID || 'nermaiiasacademy-519c8';
  let storageBucket = process.env.STORAGE_BUCKET || `${projectId}-resources`;

  try {
    if (env.NODE_ENV === 'test') {
      _app = initializeApp({ projectId });
    } else if (!env.FIREBASE_PRIVATE_KEY || env.FIREBASE_PRIVATE_KEY === 'mock-key') {
      // Cloud Functions: use Application Default Credentials with explicit bucket
      _app = initializeApp({ storageBucket });
    } else {
      // .env stores the key with literal \n — convert them to real newlines
      const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      _app = initializeApp({
        storageBucket,
        credential: cert({
          projectId,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
    logger.info(`Firebase Admin initialized successfully. Bucket: ${storageBucket}`);
  } catch (error: any) {
    logger.error('Firebase Admin initialization error:', error);
    throw new Error(`Firebase Admin failed to initialize: ${error.message}`);
  }

  return _app!;
}

// Lazy proxy exports — safe to import anywhere
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) {
      _db = getFirestore(getFirebaseApp());
      _db.settings({ ignoreUndefinedProperties: true });
    }
    return (_db as any)[prop];
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getFirebaseApp());
    return (_auth as any)[prop];
  },
});

export const messaging: Messaging = new Proxy({} as Messaging, {
  get(_target, prop) {
    if (!_messaging) _messaging = getMessaging(getFirebaseApp());
    return (_messaging as any)[prop];
  },
});

export const storage: Storage = new Proxy({} as Storage, {
  get(_target, prop) {
    if (!_storage) _storage = getStorage(getFirebaseApp());
    return (_storage as any)[prop];
  },
});

// Call eagerly so startup logs are printed immediately (except during deployment to prevent timeouts)
const isFirebaseDeploy = 
  !!process.env.GOOGLE_FUNCTION_TARGET ||
  !!process.env.FIREBASE_CONFIG ||
  process.argv.some(arg => arg.includes('firebase') || arg.includes('functions-framework') || arg.includes('deploy'));

if (!isFirebaseDeploy) {
  getFirebaseApp();
}
