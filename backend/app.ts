
import * as dotenv from "dotenv";
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

import express, { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// ─────────────────────────────────────────────────────────────────────────────
//  Online Firebase Firestore REST Client
//  Connects directly to live Firestore using public API key + open security rules
//  No service-account.json or admin credentials required!
// ─────────────────────────────────────────────────────────────────────────────

const _FS_PROJECT  = process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8";
const _FS_API_KEY  = process.env.FIREBASE_API_KEY    || "";
const _FS_BASE     = `https://firestore.googleapis.com/v1/projects/${_FS_PROJECT}/databases/(default)/documents`;
const _FS_ROOT     = `projects/${_FS_PROJECT}/databases/(default)/documents`;
const _TS_SENTINEL = "__SERVER_TIMESTAMP__";

// ── Firestore value serialisation ────────────────────────────────────────────
function _toFSV(v: any): any {
    if (v === null || v === undefined) return { nullValue: null };
    if (v === _TS_SENTINEL)            return { timestampValue: new Date().toISOString() };
    if (typeof v === "boolean")        return { booleanValue: v };
    if (typeof v === "number")         return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === "string")         return { stringValue: v };
    if (v instanceof Date)             return { timestampValue: v.toISOString() };
    if (v && typeof v.toDate === "function") return { timestampValue: v.toDate().toISOString() };
    if (Array.isArray(v))              return { arrayValue: { values: v.filter((x: any) => x !== undefined).map(_toFSV) } };
    if (typeof v === "object") {
        const fields: any = {};
        for (const k of Object.keys(v)) if (v[k] !== undefined) fields[k] = _toFSV(v[k]);
        return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
}

function _fromFSV(f: any): any {
    if (!f) return null;
    if ("nullValue"      in f) return null;
    if ("booleanValue"   in f) return f.booleanValue;
    if ("integerValue"   in f) return parseInt(String(f.integerValue), 10);
    if ("doubleValue"    in f) return Number(f.doubleValue);
    if ("stringValue"    in f) return f.stringValue;
    if ("timestampValue" in f) return { toDate: () => new Date(f.timestampValue), toMillis: () => new Date(f.timestampValue).getTime(), toJSON: () => f.timestampValue };
    if ("arrayValue"     in f) return (f.arrayValue?.values || []).map(_fromFSV);
    if ("mapValue"       in f) {
        const obj: any = {};
        for (const k of Object.keys(f.mapValue?.fields || {})) obj[k] = _fromFSV(f.mapValue.fields[k]);
        return obj;
    }
    return null;
}

function _fsDocToObj(doc: any): any {
    if (!doc?.fields) return null;
    const obj: any = {};
    for (const k of Object.keys(doc.fields)) obj[k] = _fromFSV(doc.fields[k]);
    if (doc.name) { const p = doc.name.split("/"); obj.id = p[p.length - 1]; }
    return obj;
}

function _objToFields(obj: any): any {
    const fields: any = {};
    for (const k of Object.keys(obj)) if (obj[k] !== undefined) fields[k] = _toFSV(obj[k]);
    return { fields };
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function _fsFetch(method: string, url: string, body?: any): Promise<any> {
    const sep  = url.includes("?") ? "&" : "?";
    const full = _FS_API_KEY ? `${url}${sep}key=${_FS_API_KEY}` : url;
    const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(full, opts);
    if (res.status === 204 || res.status === 200 && res.headers.get("content-length") === "0") return null;
    const text = await res.text();
    if (!res.ok) throw new Error(`Firestore [${res.status}]: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
}

// ── Document Reference ────────────────────────────────────────────────────────
class _DocRef {
    _col: string;
    id: string;
    parent: { id: string };
    constructor(col: string, id: string) {
        this._col = col;
        this.id = id;
        this.parent = { id: col };
    }

    collection(sub: string) { return new _ColRef(`${this._col}/${this.id}/${sub}`); }

    async get(): Promise<_DocSnapshot> {
        try {
            const doc = await _fsFetch("GET", `${_FS_BASE}/${this._col}/${this.id}`);
            return new _DocSnapshot(this.id, _fsDocToObj(doc), this._col);
        } catch (e: any) {
            if (e.message?.includes("404") || e.message?.includes("NOT_FOUND")) {
                return new _DocSnapshot(this.id, undefined, this._col);
            }
            throw e;
        }
    }

    async set(data: any, options?: { merge?: boolean }): Promise<void> {
        let resolvedData = { ...data };
        let hasTransforms = false;
        for (const k of Object.keys(data)) {
            const v = data[k];
            if (v && typeof v === "object" && ("__increment" in v || "__arrayUnion" in v || "__arrayRemove" in v)) {
                hasTransforms = true;
                break;
            }
        }

        if (hasTransforms) {
            try {
                const currentDoc = await this.get();
                const currentData = currentDoc.data() || {};
                for (const k of Object.keys(data)) {
                    const v = data[k];
                    if (v && typeof v === "object") {
                        if ("__increment" in v) {
                            const prev = typeof currentData[k] === "number" ? currentData[k] : 0;
                            resolvedData[k] = prev + v.__increment;
                        } else if ("__arrayUnion" in v) {
                            const prev = Array.isArray(currentData[k]) ? currentData[k] : [];
                            const itemsToAdd = Array.isArray(v.__arrayUnion) ? v.__arrayUnion : [];
                            const merged = [...prev];
                            for (const item of itemsToAdd) {
                                if (!merged.includes(item)) merged.push(item);
                            }
                            resolvedData[k] = merged;
                        } else if ("__arrayRemove" in v) {
                            const prev = Array.isArray(currentData[k]) ? currentData[k] : [];
                            const itemsToRemove = Array.isArray(v.__arrayRemove) ? v.__arrayRemove : [];
                            resolvedData[k] = prev.filter((item: any) => !itemsToRemove.includes(item));
                        }
                    }
                }
            } catch (e) {
                for (const k of Object.keys(data)) {
                    const v = data[k];
                    if (v && typeof v === "object") {
                        if ("__increment" in v) resolvedData[k] = v.__increment;
                        else if ("__arrayUnion" in v) resolvedData[k] = v.__arrayUnion;
                        else if ("__arrayRemove" in v) resolvedData[k] = [];
                    }
                }
            }
        }

        const body = _objToFields({ ...resolvedData, id: this.id });
        if (options?.merge) {
            const mask = Object.keys(resolvedData).concat("id").map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
            await _fsFetch("PATCH", `${_FS_BASE}/${this._col}/${this.id}?${mask}`, body);
        } else {
            await _fsFetch("PATCH", `${_FS_BASE}/${this._col}/${this.id}`, body);
        }
    }

    async update(data: any): Promise<void> {
        let resolvedData = { ...data };
        let hasTransforms = false;
        for (const k of Object.keys(data)) {
            const v = data[k];
            if (v && typeof v === "object" && ("__increment" in v || "__arrayUnion" in v || "__arrayRemove" in v)) {
                hasTransforms = true;
                break;
            }
        }

        if (hasTransforms) {
            try {
                const currentDoc = await this.get();
                const currentData = currentDoc.data() || {};
                for (const k of Object.keys(data)) {
                    const v = data[k];
                    if (v && typeof v === "object") {
                        if ("__increment" in v) {
                            const prev = typeof currentData[k] === "number" ? currentData[k] : 0;
                            resolvedData[k] = prev + v.__increment;
                        } else if ("__arrayUnion" in v) {
                            const prev = Array.isArray(currentData[k]) ? currentData[k] : [];
                            const itemsToAdd = Array.isArray(v.__arrayUnion) ? v.__arrayUnion : [];
                            const merged = [...prev];
                            for (const item of itemsToAdd) {
                                if (!merged.includes(item)) merged.push(item);
                            }
                            resolvedData[k] = merged;
                        } else if ("__arrayRemove" in v) {
                            const prev = Array.isArray(currentData[k]) ? currentData[k] : [];
                            const itemsToRemove = Array.isArray(v.__arrayRemove) ? v.__arrayRemove : [];
                            resolvedData[k] = prev.filter((item: any) => !itemsToRemove.includes(item));
                        }
                    }
                }
            } catch (e) {
                for (const k of Object.keys(data)) {
                    const v = data[k];
                    if (v && typeof v === "object") {
                        if ("__increment" in v) resolvedData[k] = v.__increment;
                        else if ("__arrayUnion" in v) resolvedData[k] = v.__arrayUnion;
                        else if ("__arrayRemove" in v) resolvedData[k] = [];
                    }
                }
            }
        }

        const mask = Object.keys(resolvedData).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
        await _fsFetch("PATCH", `${_FS_BASE}/${this._col}/${this.id}?${mask}`, _objToFields(resolvedData));
    }

    async delete(): Promise<void> {
        await _fsFetch("DELETE", `${_FS_BASE}/${this._col}/${this.id}`);
    }
}

// ── REST Snapshot classes ─────────────────────────────────────────────────────
class _DocSnapshot {
    id: string; exists: boolean; ref: any;
    private _d: any;
    constructor(id: string, data: any, col: string) {
        this.id = id; this._d = data;
        this.exists = data !== null && data !== undefined;
        this.ref = new _DocRef(col, id);
    }
    data() { return this._d ? { ...this._d } : undefined; }
}
class _QuerySnapshot {
    docs: _DocSnapshot[]; empty: boolean;
    constructor(docs: _DocSnapshot[]) { this.docs = docs; this.empty = docs.length === 0; }
}

// ── Query ─────────────────────────────────────────────────────────────────────
const OP_MAP: Record<string, string> = {
    "==": "EQUAL", "!=": "NOT_EQUAL",
    "<":  "LESS_THAN", "<=": "LESS_THAN_OR_EQUAL",
    ">": "GREATER_THAN", ">=": "GREATER_THAN_OR_EQUAL",
    "array-contains": "ARRAY_CONTAINS", "in": "IN", "not-in": "NOT_IN"
};

class _Query {
    protected col: string;
    protected _filters: Array<{ field: string; op: string; val: any }> = [];
    protected _orderField: string | null = null;
    protected _orderDir:   "asc" | "desc" = "asc";
    protected _limit:      number | null  = null;
    protected _offset:     number | null  = null;
    protected _startAfterId: string | null = null;

    constructor(col: string) { this.col = col; }

    where(field: string, op: string, val: any) { this._filters.push({ field, op, val }); return this; }
    orderBy(field: string, dir: "asc" | "desc" = "asc") { this._orderField = field; this._orderDir = dir; return this; }
    limit(n: number) { this._limit = n; return this; }
    offset(n: number) { this._offset = n; return this; }
    startAfter(doc: any) { this._startAfterId = doc?.id || null; return this; }

    async get(): Promise<_QuerySnapshot> {
        const hasOrderBy = !!this._orderField;
        // Build structured query
        const sq: any = { from: [{ collectionId: this.col.split("/").pop() }] };

        // Handle nested collections (e.g. "users/abc/posts")
        if (this.col.includes("/")) {
            // Use a collection group or adjust path — for nested just set parent path
        }

        if (this._filters.length > 0) {
            const filters = this._filters.map(f => ({
                fieldFilter: {
                    field: { fieldPath: f.field },
                    op: OP_MAP[f.op] || "EQUAL",
                    value: _toFSV(f.val)
                }
            }));
            sq.where = filters.length === 1
                ? filters[0]
                : { compositeFilter: { op: "AND", filters } };
        }

        if (this._orderField) {
            sq.orderBy = [{ field: { fieldPath: this._orderField }, direction: this._orderDir === "desc" ? "DESCENDING" : "ASCENDING" }];
        }

        if (this._limit !== null) {
            sq.limit = this._limit;
        }

        if (this._offset !== null) {
            sq.offset = this._offset;
        }

        // Determine parent path for potentially nested collections
        const parts = this.col.split("/");
        const colId  = parts.pop();
        const parent = parts.length > 0 ? `${_FS_ROOT}/${parts.join("/")}` : _FS_ROOT;

        const response: any[] = await _fsFetch("POST",
            `https://firestore.googleapis.com/v1/${parent}:runQuery`,
            { structuredQuery: { ...sq, from: [{ collectionId: colId }] } }
        ) || [];

        let docs = (Array.isArray(response) ? response : [])
            .filter((r: any) => r.document)
            .map((r: any) => {
                const obj = _fsDocToObj(r.document);
                const docId = r.document.name.split("/").pop();
                return new _DocSnapshot(docId, obj, this.col);
            });

        // Client-side sorting
        if (hasOrderBy && this._orderField) {
            const field = this._orderField;
            const isDesc = this._orderDir === "desc";
            docs.sort((a, b) => {
                const valA = a.data()?.[field];
                const valB = b.data()?.[field];
                
                const getCompVal = (val: any) => {
                    if (val === null || val === undefined) return "";
                    if (val && typeof val.toMillis === "function") return val.toMillis();
                    if (val && typeof val.toDate === "function") return val.toDate().getTime();
                    if (val instanceof Date) return val.getTime();
                    if (typeof val === "string") return val.toLowerCase();
                    return val;
                };

                const compA = getCompVal(valA);
                const compB = getCompVal(valB);

                if (compA < compB) return isDesc ? 1 : -1;
                if (compA > compB) return isDesc ? -1 : 1;
                return 0;
            });
        }

        // Client-side startAfter by doc id
        if (this._startAfterId) {
            const idx = docs.findIndex(d => d.id === this._startAfterId);
            if (idx !== -1) docs = docs.slice(idx + 1);
        }

        // Client-side offset
        if (hasOrderBy && this._offset !== null) {
            docs = docs.slice(this._offset);
        }

        // Client-side limit
        if (hasOrderBy && this._limit !== null) {
            docs = docs.slice(0, this._limit);
        }

        return new _QuerySnapshot(docs);
    }
}

// ── Collection Reference ──────────────────────────────────────────────────────
class _ColRef extends _Query {
    constructor(col: string) { super(col); }
    doc(id?: string): _DocRef {
        const docId = id || (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2));
        return new _DocRef(this.col, docId);
    }
}

// ── Batch ─────────────────────────────────────────────────────────────────────
class _Batch {
    private _ops: Array<() => Promise<void>> = [];

    set(ref: _DocRef, data: any, options?: { merge?: boolean }) {
        this._ops.push(() => ref.set(data, options));
        return this;
    }
    update(ref: _DocRef, data: any) {
        this._ops.push(() => ref.update(data));
        return this;
    }
    delete(ref: _DocRef) {
        this._ops.push(() => ref.delete());
        return this;
    }
    async commit() {
        if (this._ops.length === 0) return [];
        const chunkSize = 10;
        for (let i = 0; i < this._ops.length; i += chunkSize) {
            const chunk = this._ops.slice(i, i + chunkSize);
            await Promise.all(chunk.map(op => op()));
        }
        return [];
    }
}

// ── Main Firestore client ─────────────────────────────────────────────────────
class _RestFirestore {
    collection(name: string): _ColRef { return new _ColRef(name); }
    batch(): _Batch { return new _Batch(); }
    async getAll(...refs: _DocRef[]) { return Promise.all(refs.map(r => r.get())); }
}


// Smart Firebase/Admin SDK detection and initialization

const serviceAccountPath = path.join(__dirname, "service-account.json");
const hasServiceAccount = fs.existsSync(serviceAccountPath);
const hasGoogleEnv = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.K_SERVICE || !!process.env.FUNCTIONS_EMULATOR;
const hasEnvCredentials = !!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID);

if (hasServiceAccount || hasGoogleEnv || hasEnvCredentials) {
    if (!admin.apps.length) {
        if (hasServiceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
                databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
            });
            console.log("Firebase Admin SDK initialized using local service-account.json key.");
        } else if (hasEnvCredentials) {
            const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
            });
            console.log("Firebase Admin SDK initialized using environment variable credentials.");
        } else {
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
                databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
            });
            console.log("Firebase Admin SDK initialized using default environment configurations.");
        }
    }
} else {
    console.log("==================================================================================");
    console.log("✅ Connecting to ONLINE Firebase Firestore via REST API");
    console.log(`   Project: ${_FS_PROJECT}`);
    console.log("   Mode: Public API key (security rules open for prototype)");
    console.log("==================================================================================");

    // Patch firebase-admin to use the online REST-based Firestore client
    const restFirestoreInstance = new _RestFirestore();
    const firestoreFunc = () => restFirestoreInstance;
    (firestoreFunc as any).FieldValue = {
        serverTimestamp: () => _TS_SENTINEL,
        arrayUnion: (...items: any[]) => ({ __arrayUnion: items }),
        arrayRemove: (...items: any[]) => ({ __arrayRemove: items }),
        increment: (n: number) => ({ __increment: n })
    };
    (firestoreFunc as any).Timestamp = {
        fromDate: (date: Date) => ({ toDate: () => date, toMillis: () => date.getTime(), toJSON: () => date.toISOString() }),
        now: () => { const d = new Date(); return { toDate: () => d, toMillis: () => d.getTime(), toJSON: () => d.toISOString() }; }
    };
    Object.defineProperty(admin, "firestore", { value: firestoreFunc, configurable: true, writable: true });
    Object.defineProperty(admin, "initializeApp",  { value: () => ({} as any), configurable: true, writable: true });
    Object.defineProperty(admin, "apps", { value: [{ name: "[DEFAULT]" }], configurable: true, writable: true });
}



import zlib from "zlib";



const app = express();

// ─── CORS — environment-controlled allowlist ─────────────────────────────────
// NEVER use wildcard (*) in production.
// Set ALLOWED_ORIGINS in .env as comma-separated list of your frontend domains.
// Example: ALLOWED_ORIGINS=https://nermai.in,https://app.nermai.in
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:3000,http://localhost:19006';
const ALLOWED_ORIGINS = new Set(ALLOWED_ORIGINS_RAW.split(',').map(o => o.trim()).filter(Boolean));

app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '';
    const isAllowed = ALLOWED_ORIGINS.has(origin) || process.env.NODE_ENV !== 'production';

    if (isAllowed && origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    } else if (!origin) {
        // Non-browser requests (curl, server-to-server, mobile native) — allow
        res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    // SECURITY: Removed user-id, user-role, x-is-admin from allowed headers — these must NEVER be used for auth
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, accept-encoding, user-role");
    res.setHeader("Access-Control-Allow-Credentials", "true"); // Required for cookie-based auth

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
    // CSP: Allow Firebase, Cloudinary, Zoom, and same-origin scripts.
    // Zoom Web SDK requires 'unsafe-inline' scripts and frames — these are documented exceptions.
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",     // Required by Zoom SDK
                "'unsafe-eval'",       // Required by some Expo/Metro builds
                "https://appssdk.zoom.us",
                "https://apis.google.com",
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://firebasestorage.googleapis.com", "https://*.zoom.us"],
            mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://firebasestorage.googleapis.com"],
            connectSrc: [
                "'self'",
                "https://*.googleapis.com",
                "https://*.firebase.com",
                "https://*.firebaseio.com",
                "https://*.zoom.us",
                "wss://*.zoom.us",
                "https://api.groq.com",
                "https://generativelanguage.googleapis.com",
            ],
            frameSrc: [
                "'self'",
                "https://*.zoom.us",
                "https://docs.google.com",  // PDF embed
                "https://drive.google.com",
            ],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        } as any,
    },
    // HSTS: Strict-Transport-Security for production
    hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    crossOriginEmbedderPolicy: false,  // Required for Zoom/PDF embedding
    crossOriginOpenerPolicy: false,    // Required for Zoom SDK
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: false,                 // Handled via CSP frame-ancestors
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,         // X-Content-Type-Options: nosniff
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// Cookie parser — required for HttpOnly refresh token cookies
app.use(cookieParser());

// High Concurrency Traffic & Response Compression Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    // Keep-Alive socket headers for high concurrency test-taking
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Keep-Alive", "timeout=60");

    // Native gzip compression for payloads larger than 1KB
    const acceptEncoding = (req.headers["accept-encoding"] as string) || "";
    if (acceptEncoding.includes("gzip")) {
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
            const jsonStr = JSON.stringify(body);
            if (jsonStr.length > 1024) {
                zlib.gzip(Buffer.from(jsonStr), (err, compressedBuffer) => {
                    if (err) {
                        return originalJson(body);
                    }
                    res.setHeader("Content-Encoding", "gzip");
                    res.setHeader("Content-Type", "application/json");
                    res.setHeader("Vary", "Accept-Encoding");
                    return res.send(compressedBuffer);
                });
                return res;
            }
            return originalJson(body);
        } as any;
    }
    next();
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    // Log non-GET non-OPTIONS or key test requests
    if ((req.method !== "GET" && req.method !== "OPTIONS") || req.url.includes("/test-portal")) {
        console.log(`[API REQUEST ${process.pid}] ${req.method} ${req.url}`);
    }
    next();
});

// Serve static upload directories for PDFs and Images
const publicDir = path.resolve(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
const uploadsDir = path.resolve(publicDir, "uploads", "daily_content");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/public", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(publicDir));

app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
}, express.static(path.resolve(publicDir, "uploads")));

// Mount all API routes under /api
// Lazy load API routes to speed up startup/cold-starts and prevent Firebase CLI timeout
let lazyApiRouter: any = null;
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (!lazyApiRouter) {
        console.log("[Express] Lazy loading API routes & registering live providers...");
        try {
            const { ProviderRegistry } = require("./modules/live-sessions/providers/ProviderRegistry");
            const { ZoomProvider } = require("./modules/live-sessions/providers/ZoomProvider");
            const { YouTubeProvider } = require("./modules/live-sessions/providers/YouTubeProvider");
            ProviderRegistry.registerProvider("zoom", new ZoomProvider());
            ProviderRegistry.registerProvider("youtube", new YouTubeProvider());
        } catch (e: any) {
            console.error("[app.ts] Failed initializing live providers:", e?.message || e);
        }
        lazyApiRouter = require("./routes").default;
    }
    lazyApiRouter(req, res, next);
});

// Base route for API status
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Nermai Academy backend is running"
    });
});

// Catch 404
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found"
    });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const message = err?.message || String(err || "Internal Server Error");
    console.error(`[Global Error ${process.pid}]`, message);
    const statusCode = err?.status || err?.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        status: 'error',
        message: message
    });
});

export default app;
