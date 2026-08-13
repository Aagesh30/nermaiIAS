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
const FREEBIES_COLLECTION = "freebies";

export class FreebiesController {
    /**
     * CREATE/UPDATE FREEBIE (Admin)
     * POST /api/crm/freebies
     */
    static async createOrUpdateFreebie(req: Request, res: Response) {
        try {
            const {
                id,
                title,
                description,
                contentType, // "video", "pdf", "image", "text"
                contentUrl,
                thumbnailUrl,
                isActive = true,
                createdBy
            } = req.body;

            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: "Title is required"
                });
            }

            let freebieId = id;

            if (freebieId) {
                // Update existing
                const docRef = db.collection(FREEBIES_COLLECTION).doc(freebieId);
                const doc = await docRef.get();

                if (!doc.exists || doc.data()?.isDeleted) {
                    return res.status(404).json({
                        success: false,
                        message: "Freebie not found"
                    });
                }

                await docRef.update({
                    title,
                    description: description || "",
                    contentType: contentType || "text",
                    contentUrl: contentUrl || "",
                    thumbnailUrl: thumbnailUrl || "",
                    isActive,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedBy: createdBy || "admin"
                });

                return res.status(200).json({
                    success: true,
                    message: "Freebie updated successfully",
                    data: { freebieId }
                });
            } else {
                // Create new
                freebieId = randomUUID();
                await db.collection(FREEBIES_COLLECTION).doc(freebieId).set({
                    id: freebieId,
                    title,
                    description: description || "",
                    contentType: contentType || "text",
                    contentUrl: contentUrl || "",
                    thumbnailUrl: thumbnailUrl || "",
                    isActive,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: createdBy || "admin",
                    updatedBy: createdBy || "admin",
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                });

                return res.status(201).json({
                    success: true,
                    message: "Freebie created successfully",
                    data: { freebieId }
                });
            }
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while saving freebie"
            });
        }
    }

    /**
     * GET ALL ACTIVE FREEBIES (Public/Students)
     * GET /api/crm/freebies
     */
    static async getFreebies(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(FREEBIES_COLLECTION)
                .where("isDeleted", "==", false)
                .where("isActive", "==", true)
                .orderBy("createdAt", "desc")
                .get();

            const freebies = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: freebies
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving freebies"
            });
        }
    }

    /**
     * GET ALL FREEBIES (Admin - including inactive)
     * GET /api/crm/freebies/admin
     */
    static async getAdminFreebies(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(FREEBIES_COLLECTION)
                .where("isDeleted", "==", false)
                .orderBy("createdAt", "desc")
                .get();

            const freebies = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: freebies
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving freebies"
            });
        }
    }

    /**
     * DELETE FREEBIE (Admin - Soft delete)
     * DELETE /api/crm/freebies/:id
     */
    static async deleteFreebie(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            const docRef = db.collection(FREEBIES_COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Freebie not found"
                });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin"
            });

            return res.status(200).json({
                success: true,
                message: "Freebie deleted successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting freebie"
            });
        }
    }
}
