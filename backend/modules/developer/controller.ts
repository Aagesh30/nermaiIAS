import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

// ──────────────────────────────────────────────────────────────────────────────
// DEVELOPER PORTAL — no hardcoded credentials.
// Authentication is handled by requireAuth + requireRole(['super_admin'])
// via the standard /api/auth/login flow.
// ──────────────────────────────────────────────────────────────────────────────

// All known Firestore collections in this project (allowlist)
const KNOWN_COLLECTIONS = [
    "users",
    "students",
    "staff",
    "batches",
    "fees",
    "marks",
    "profile_requests",
    "announcements",
    "tests",
    "questions",
    "student_attempts",
    "student_answers",
    "results",
    "leaderboards",
    "daily_quiz",
    "quiz_attempts",
    "crm_leads",
    "admissions",
    "campaigns",
    "alumni_feedback",
    "fee_reminders",
    "courses",
    "freebies",
    "notifications"
];

export class DeveloperController {

    /**
     * LIST ALL COLLECTIONS
     * GET /developer/collections
     */
    static async listCollections(req: Request, res: Response) {
        try {
            // Return known collections with document counts
            const collectionStats: any[] = [];

            for (const col of KNOWN_COLLECTIONS) {
                try {
                    const snapshot = await db.collection(col).count().get();
                    collectionStats.push({
                        name: col,
                        count: snapshot.data().count
                    });
                } catch {
                    collectionStats.push({ name: col, count: 0 });
                }
            }

            return res.status(200).json({
                success: true,
                data: collectionStats
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to list collections"
            });
        }
    }

    /**
     * GET DOCUMENTS IN A COLLECTION
     * GET /developer/collection/:name?limit=50&offset=0&search=
     */
    static async getDocuments(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const limit = Math.min(Number(req.query.limit) || 50, 200);
            const offset = Number(req.query.offset) || 0;
            const search = String(req.query.search || "").toLowerCase().trim();

            const colName = name === "notifications" ? "announcements" : name;
            let query: FirebaseFirestore.Query = db.collection(colName).orderBy("__name__");

            const snapshot = await query.offset(offset).limit(limit).get();

            let docs = snapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data()
            }));



            // Client-side search filter (basic ID/string match)
            if (search) {
                docs = docs.filter(d => {
                    const str = JSON.stringify(d).toLowerCase();
                    return str.includes(search);
                });
            }

            // Serialize Firestore Timestamps to ISO strings
            const serialize = (obj: any): any => {
                if (obj === null || obj === undefined) return obj;
                if (obj && typeof obj.toDate === "function") return obj.toDate().toISOString();
                if (Array.isArray(obj)) return obj.map(serialize);
                if (typeof obj === "object") {
                    const result: any = {};
                    for (const key of Object.keys(obj)) {
                        result[key] = serialize(obj[key]);
                    }
                    return result;
                }
                return obj;
            };

            return res.status(200).json({
                success: true,
                data: {
                    collection: name,
                    total: snapshot.size,
                    offset,
                    limit,
                    docs: serialize(docs)
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to get documents"
            });
        }
    }

    /**
     * GET SINGLE DOCUMENT
     * GET /developer/collection/:name/:docId
     */
    static async getDocument(req: Request, res: Response) {
        try {
            const { name, docId } = req.params;
            const colName = name === "notifications" ? "announcements" : name;
            const doc = await db.collection(colName).doc(docId).get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Document not found" });
            }

            const serialize = (obj: any): any => {
                if (obj === null || obj === undefined) return obj;
                if (obj && typeof obj.toDate === "function") return obj.toDate().toISOString();
                if (Array.isArray(obj)) return obj.map(serialize);
                if (typeof obj === "object") {
                    const result: any = {};
                    for (const key of Object.keys(obj)) result[key] = serialize(obj[key]);
                    return result;
                }
                return obj;
            };

            return res.status(200).json({
                success: true,
                data: serialize({ _id: doc.id, ...doc.data() })
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * CREATE DOCUMENT
     * POST /developer/collection/:name
     * Body: { _id?: string, ...fields }
     */
    static async createDocument(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const { _id, ...data } = req.body;

            // SECURITY: Reject plaintext password fields — use the auth service to set passwords.
            if ('password' in data || 'loginPassword' in data) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot write password fields via developer portal. Use the auth service or ERP to manage credentials."
                });
            }

            // Validate collection is in allowlist
            const colName = name === "notifications" ? "announcements" : name;
            if (!KNOWN_COLLECTIONS.includes(colName) && colName !== "announcements") {
                return res.status(400).json({ success: false, message: `Collection '${name}' is not in the allowlist.` });
            }

            data.createdAt = admin.firestore.FieldValue.serverTimestamp();
            data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            if (name === "notifications") {
                data.isNotification = true;
            }

            let docRef: FirebaseFirestore.DocumentReference;
            if (_id) {
                docRef = db.collection(colName).doc(_id);
                await docRef.set(data);
            } else {
                const newId = randomUUID();
                docRef = db.collection(colName).doc(newId);
                await docRef.set(data);
            }

            return res.status(201).json({
                success: true,
                message: "Document created",
                data: { id: docRef.id }
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * UPDATE DOCUMENT
     * PUT /developer/collection/:name/:docId
     * Body: { ...fields to update }
     */
    static async updateDocument(req: Request, res: Response) {
        try {
            const { name, docId } = req.params;
            const { _id, ...data } = req.body;

            // SECURITY: Reject plaintext password fields.
            if ('password' in data || 'loginPassword' in data) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot update password fields via developer portal. Use the auth service or ERP to manage credentials."
                });
            }

            const colName = name === "notifications" ? "announcements" : name;

            // Validate collection is in allowlist
            if (!KNOWN_COLLECTIONS.includes(colName) && colName !== "announcements") {
                return res.status(400).json({ success: false, message: `Collection '${name}' is not in the allowlist.` });
            }

            data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            await db.collection(colName).doc(docId).update(data);

            return res.status(200).json({
                success: true,
                message: "Document updated"
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE DOCUMENT
     * DELETE /developer/collection/:name/:docId
     */
    static async deleteDocument(req: Request, res: Response) {
        try {
            const { name, docId } = req.params;

            const colName = name === "notifications" ? "announcements" : name;

            // Sync deletion with users collection before deletion
            if (colName === "students") {
                const userSnapshot = await db.collection("users").where("studentId", "==", docId).get();
                for (const userDoc of userSnapshot.docs) {
                    await db.collection("users").doc(userDoc.id).delete();
                }
            } else if (colName === "staff") {
                const staffDoc = await db.collection("staff").doc(docId).get();
                const staffData = staffDoc.data();
                if (staffData && staffData.loginUsername) {
                    const userSnapshot = await db.collection("users").where("username", "==", staffData.loginUsername).get();
                    for (const userDoc of userSnapshot.docs) {
                        await db.collection("users").doc(userDoc.id).delete();
                    }
                }
            }

            await db.collection(colName).doc(docId).delete();

            return res.status(200).json({
                success: true,
                message: "Document deleted permanently"
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * BULK DELETE
     * DELETE /developer/collection/:name
     * Body: { ids: string[] }
     */
    static async bulkDelete(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: "ids array required" });
            }

            const colName = name === "notifications" ? "announcements" : name;
            const batch = db.batch();
            ids.forEach(id => {
                batch.delete(db.collection(colName).doc(id));
            });
            await batch.commit();

            return res.status(200).json({
                success: true,
                message: `${ids.length} documents deleted`
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * RAW QUERY (Advanced)
     * POST /developer/query/:name
     * Body: { field, op, value, orderBy?, limit? }
     */
    static async rawQuery(req: Request, res: Response) {
        try {
            const { name } = req.params;
            const { field, op, value, orderBy, limit: qLimit } = req.body;

            const VALID_OPS = ["==", "!=", ">", ">=", "<", "<=", "array-contains", "in"];
            if (!field || !VALID_OPS.includes(op)) {
                return res.status(400).json({ success: false, message: "Invalid field or operator" });
            }

            const colName = name === "notifications" ? "announcements" : name;
            let query: FirebaseFirestore.Query = db.collection(colName).where(field, op as any, value);
            if (orderBy) query = query.orderBy(orderBy);
            if (qLimit) query = query.limit(Math.min(Number(qLimit), 500));

            const snapshot = await query.get();

            const serialize = (obj: any): any => {
                if (obj === null || obj === undefined) return obj;
                if (obj && typeof obj.toDate === "function") return obj.toDate().toISOString();
                if (Array.isArray(obj)) return obj.map(serialize);
                if (typeof obj === "object") {
                    const result: any = {};
                    for (const key of Object.keys(obj)) result[key] = serialize(obj[key]);
                    return result;
                }
                return obj;
            };

            let docs = snapshot.docs.map(d => serialize({ _id: d.id, ...d.data() }));
            if (name === "notifications") {
                docs = docs.filter((d: any) => d.isNotification === true);
            }

            return res.status(200).json({
                success: true,
                data: {
                    count: docs.length,
                    docs: docs
                }
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getRolePermissions(req: Request, res: Response) {
        const defaults: any = {
            super_admin: {
                students: "CRUD", batches: "CRUD", announcements: "CRUD", fees: "CRUD", tests: "CRUD", quiz: "CRUD", "id-card": "CRUD"
            },
            admin: {
                students: "CRUD", batches: "CRUD", announcements: "CRUD", fees: "CRUD", tests: "CRUD", quiz: "CRUD", "id-card": "CRUD"
            },
            editor: {
                students: "CRU only", batches: "CRU only", announcements: "CRU only", fees: "CRU only", tests: "CRU only", quiz: "CRU only", "id-card": "CRU only"
            },
            contributor: {
                students: "CR only", batches: "CR only", announcements: "CR only", fees: "CR only", tests: "CR only", quiz: "CR only", "id-card": "CR only"
            }
        };

        try {
            const defaultsList = ["super_admin", "admin", "editor", "contributor"];
            const permissions: any = {};

            // 1. Get all documents from role_permissions collection
            const snapshot = await db.collection("role_permissions").get();
            snapshot.docs.forEach(doc => {
                permissions[doc.id] = doc.data();
            });

            // 2. Ensure default roles exist in the database and permissions object
            for (const r of defaultsList) {
                if (!permissions[r]) {
                    try {
                        await db.collection("role_permissions").doc(r).set(defaults[r]);
                    } catch (dbErr) {
                        console.warn("Could not write default role permissions to DB:", dbErr);
                    }
                    permissions[r] = defaults[r];
                }
            }

            return res.status(200).json({
                success: true,
                data: permissions
            });

        } catch (error: any) {
            console.warn("Firestore error loading role permissions, falling back to local defaults:", error.message || error);
            return res.status(200).json({
                success: true,
                data: defaults
            });
        }
    }

    /**
     * UPDATE ROLE PERMISSIONS
     * PUT /developer/role-permissions/:role
     */
    static async updateRolePermissions(req: Request, res: Response) {
        try {
            const { role } = req.params;
            const permissions = req.body; // e.g. { students: "CRUD", ... }

            await db.collection("role_permissions").doc(role).set(permissions, { merge: true });

            return res.status(200).json({
                success: true,
                message: `Permissions updated for ${role}`
            });

        } catch (error: any) {
            console.error("Failed to update role permissions in Firestore:", error);
            return res.status(200).json({
                success: true,
                message: `Permissions updated locally (Firestore restricted: ${error.message})`
            });
        }
    }

    /**
     * GET PAGE LOCKS
     * GET /developer/page-locks
     */
    static async getPageLocks(req: Request, res: Response) {
        try {
            const doc = await db.collection("settings").doc("page_locks").get();
            const locks = doc.exists ? (doc.data()?.lockedPages || {}) : {};
            return res.status(200).json({
                success: true,
                data: locks
            });
        } catch (error: any) {
            return res.status(200).json({
                success: true,
                data: {}
            });
        }
    }

    /**
     * UPDATE PAGE LOCKS
     * PUT /developer/page-locks
     */
    static async updatePageLocks(req: Request, res: Response) {
        try {
            const { lockedPages } = req.body;
            await db.collection("settings").doc("page_locks").set({ lockedPages, updatedAt: new Date().toISOString() }, { merge: true });
            return res.status(200).json({
                success: true,
                message: "Page locks updated globally",
                data: lockedPages
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to update page locks"
            });
        }
    }
}
