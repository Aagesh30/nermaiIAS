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
const COLLECTION = "announcements";

export class AnnouncementController {
    /**
     * CREATE ANNOUNCEMENT
     * POST /api/announcement
     */
    static async create(req: Request, res: Response) {
        try {
            const { title, content, priority, targetDashboard, targetBatch, publishedAt, expiresAt, timerOption, createdBy } = req.body;

            if (!title || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Title is required"
                });
            }

            if (!content || !content.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Content is required"
                });
            }

            const id = randomUUID();
            let pubTimestamp: any = admin.firestore.FieldValue.serverTimestamp();
            if (publishedAt) {
                const parsedDate = new Date(publishedAt);
                if (!isNaN(parsedDate.getTime())) {
                    pubTimestamp = admin.firestore.Timestamp.fromDate(parsedDate);
                }
            }

            const payload = {
                id,
                title: title.trim(),
                content: content.trim(),
                priority: priority === "high" ? "high" : "normal",
                targetDashboard: targetDashboard || "all", // "student", "staff", "all", "batch", "free", "paid"
                targetBatch: targetBatch || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                publishedAt: pubTimestamp,
                expiresAt: expiresAt || null,
                timerOption: timerOption || null,
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Announcement created successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    publishedAt: publishedAt || new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while creating the announcement"
            });
        }
    }

    /**
     * GET ALL ANNOUNCEMENTS (WITH SORTING & FILTERING)
     * GET /api/announcement
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { role, batch } = req.query;

            const snapshot = await db.collection(COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            let announcements = snapshot.docs.map(doc => {
                const data = doc.data();
                const toIsoString = (val: any) => {
                    if (!val) return null;
                    if (typeof val.toDate === "function") return val.toDate().toISOString();
                    if (val instanceof Date) return val.toISOString();
                    if (typeof val === "string") return val;
                    return String(val);
                };
                return {
                    ...data,
                    createdAt: toIsoString(data.createdAt),
                    updatedAt: toIsoString(data.updatedAt),
                    publishedAt: toIsoString(data.publishedAt) || toIsoString(data.createdAt)
                };
            });

            // Filter out internal/developer notifications (e.g. approval requests)
            announcements = announcements.filter((ann: any) => ann.isNotification !== true);

            // Filter out expired announcements for students/guests
            const now = Date.now();
            announcements = announcements.filter((ann: any) => {
                if (ann.expiresAt) {
                    const expiry = new Date(ann.expiresAt).getTime();
                    if (!isNaN(expiry) && expiry < now) {
                        if (role) {
                            const userRole = String(role).toLowerCase();
                            const adminRoles = ["super_admin", "admin", "staff", "editor", "contributor", "developer"];
                            if (!adminRoles.includes(userRole)) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }
                }
                return true;
            });

            // Filter announcements based on target user role and batch
            if (role) {
                const userRole = String(role).toLowerCase();
                announcements = announcements.filter((ann: any) => {
                    const target = String(ann.targetDashboard || "all").toLowerCase();

                    // "all" is visible to everyone
                    if (target === "all") return true;

                    if (userRole === "guest") {
                        // Guests ONLY see notices explicitly targeted at "free" (guest users)
                        return target === "free";
                    }

                    if (userRole === "student") {
                        // Paid students see "paid" and "student" targets only — NOT "free" (guest-only)
                        if (target === "paid" || target === "student") return true;
                        if (target === "batch") {
                            if (!batch) return false;
                            return String(ann.targetBatch || "").toLowerCase() === String(batch).toLowerCase();
                        }
                        // "free" is EXCLUSIVE to guests — paid students must NOT see it
                        return false;
                    }

                    const adminRoles = ["super_admin", "admin", "staff", "editor", "contributor", "developer"];
                    if (adminRoles.includes(userRole)) {
                        const specificAdminTargets = ["super_admin", "admin", "staff", "editor", "contributor", "all_admins"];
                        if (specificAdminTargets.includes(target)) {
                            return target === "all_admins" || target === userRole;
                        }
                        return true;
                    }

                    return true;
                });
            }

            // Sort in-memory: high priority first, then newest first
            announcements.sort((a: any, b: any) => {
                const priorityA = a.priority === "high" ? 1 : 0;
                const priorityB = b.priority === "high" ? 1 : 0;
                if (priorityA !== priorityB) return priorityB - priorityA;
                
                const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return timeB - timeA;
            });

            return res.status(200).json({
                success: true,
                data: announcements
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving announcements"
            });
        }
    }

    /**
     * GET SINGLE ANNOUNCEMENT
     * GET /api/announcement/:id
     */
    static async getOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const doc = await db.collection(COLLECTION).doc(id).get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Announcement not found"
                });
            }

            const data = doc.data()!;
            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    publishedAt: data.publishedAt ? (data.publishedAt as admin.firestore.Timestamp).toDate().toISOString() : (data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null)
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving the announcement"
            });
        }
    }

    /**
     * UPDATE ANNOUNCEMENT
     * PUT /api/announcement/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, content, priority, targetDashboard, targetBatch, publishedAt, expiresAt, timerOption, updatedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Announcement not found"
                });
            }

            const updateData: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: updatedBy || "admin"
            };

            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content;
            if (priority !== undefined) updateData.priority = priority === "high" ? "high" : "normal";
            if (targetDashboard !== undefined) updateData.targetDashboard = targetDashboard;
            if (targetBatch !== undefined) updateData.targetBatch = targetBatch;
            if (publishedAt !== undefined) {
                updateData.publishedAt = publishedAt ? admin.firestore.Timestamp.fromDate(new Date(publishedAt)) : admin.firestore.FieldValue.serverTimestamp();
            }
            if (expiresAt !== undefined) updateData.expiresAt = expiresAt;
            if (timerOption !== undefined) updateData.timerOption = timerOption;

            await docRef.update(updateData);

            return res.status(200).json({
                success: true,
                message: "Announcement updated successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while updating the announcement"
            });
        }
    }

    /**
     * SOFT DELETE ANNOUNCEMENT
     * DELETE /api/announcement/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Announcement not found"
                });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin"
            });

            return res.status(200).json({
                success: true,
                message: "Announcement deleted successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting the announcement"
            });
        }
    }
}
