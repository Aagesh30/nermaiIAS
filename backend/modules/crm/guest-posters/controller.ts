import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { uploadFileToGoogleDrive } from "../../../services/google_drive";

const db = admin.firestore();
const COLLECTION = "guestPosters";

export class GuestPostersController {
    /**
     * GET ALL GUEST POSTERS (Public)
     * GET /api/crm/guest-posters
     */
    static async getAll(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const posters = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt
                        ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString()
                        : null,
                };
            });

            // Sort newest first
            posters.sort((a: any, b: any) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tB - tA;
            });

            return res.status(200).json({ success: true, data: posters });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * CREATE GUEST POSTER (Admin)
     * POST /api/crm/guest-posters
     * Body: { title, posterBase64, createdBy }
     */
    static async create(req: Request, res: Response) {
        try {
            const { title, posterBase64, createdBy } = req.body;

            if (!posterBase64) {
                return res.status(400).json({ success: false, message: "Poster image is required." });
            }

            // Upload image to Google Drive
            let posterUrl = "";
            let cleanBase64 = posterBase64;
            if (posterBase64.includes("base64,")) {
                cleanBase64 = posterBase64.split("base64,")[1];
            }
            const buffer = Buffer.from(cleanBase64, "base64");
            const driveResult = await uploadFileToGoogleDrive({
                buffer,
                fileName: `GuestPoster_${Date.now()}_${(title || "poster").replace(/[^a-zA-Z0-9]/g, "_")}.jpg`,
                mimeType: "image/jpeg",
                subPath: "crm/guest-posters"
            });

            if (driveResult?.previewUrl) {
                posterUrl = driveResult.previewUrl;
            } else {
                return res.status(500).json({ success: false, message: "Failed to upload image to Drive." });
            }

            const id = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            await db.collection(COLLECTION).doc(id).set({
                id,
                title: title || "",
                posterUrl,
                isDeleted: false,
                createdAt: now,
                createdBy: createdBy || "admin",
            });

            return res.status(201).json({ success: true, message: "Guest poster created.", data: { id, posterUrl } });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * DELETE GUEST POSTER (Admin — soft delete)
     * DELETE /api/crm/guest-posters/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Poster not found." });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({ success: true, message: "Guest poster deleted." });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }
}
