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
const COLLECTION = "batches";

export class BatchController {
    /**
     * GET ALL BATCHES
     * GET /api/erp/batch
     */
    static async getAll(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(COLLECTION).get();

            let batches = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: data.id || doc.id,
                    createdAt: data.createdAt ? (data.createdAt as any).toDate?.()?.toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as any).toDate?.()?.toISOString() : null
                };
            }).filter((b: any) => b.isDeleted !== true);

            // Sort by createdAt descending in-memory
            batches.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            return res.status(200).json({ success: true, data: batches });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to fetch batches" });
        }
    }

    /**
     * CREATE BATCH
     * POST /api/erp/batch
     */
    static async create(req: Request, res: Response) {
        try {
            const { batchName, course, year, description, isSpecial, subBatches, createdBy } = req.body;

            if (!batchName || !course) {
                return res.status(400).json({ success: false, message: "Batch name and course are required" });
            }

            // Check if batch name already exists
            const existing = await db.collection(COLLECTION)
                .where("batchName", "==", batchName)
                .where("isDeleted", "==", false)
                .limit(1)
                .get();

            if (!existing.empty) {
                return res.status(400).json({ success: false, message: "Batch name already exists" });
            }

            const id = randomUUID();
            const payload = {
                id,
                batchName,
                course,
                year: year || String(new Date().getFullYear()),
                description: description || "",
                isSpecial: !!isSpecial,
                subBatches: Array.isArray(subBatches) ? subBatches : [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null
            };

            await db.collection(COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Batch created successfully",
                data: { ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to create batch" });
        }
    }

    /**
     * UPDATE BATCH
     * PUT /api/erp/batch/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { batchName, course, year, description, isSpecial, subBatches, updatedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Batch not found" });
            }

            const updateData: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: updatedBy || "admin"
            };
            if (batchName !== undefined) updateData.batchName = batchName;
            if (course !== undefined) updateData.course = course;
            if (year !== undefined) updateData.year = year;
            if (description !== undefined) updateData.description = description;
            if (isSpecial !== undefined) updateData.isSpecial = !!isSpecial;
            if (subBatches !== undefined) updateData.subBatches = Array.isArray(subBatches) ? subBatches : [];

            await docRef.update(updateData);
            return res.status(200).json({ success: true, message: "Batch updated successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to update batch" });
        }
    }

    /**
     * DELETE BATCH
     * DELETE /api/erp/batch/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Batch not found" });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, message: "Batch deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to delete batch" });
        }
    }
}
