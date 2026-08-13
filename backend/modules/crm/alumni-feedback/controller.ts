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
const FEEDBACK_COLLECTION = "alumniFeedback";

export class AlumniFeedbackController {
    static async create(req: Request, res: Response) {
        try {
            console.log("[FEEDBACK CREATE] Received payload:", req.body);
            const { name, email, batch, feedback, rating, createdBy } = req.body;
            const id = randomUUID();
            await db.collection(FEEDBACK_COLLECTION).doc(id).set({
                id, name, email, batch, feedback, rating,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                isDeleted: false
            });
            console.log("[FEEDBACK CREATE] Successfully saved feedback id:", id);
            return res.status(201).json({ success: true, message: "Feedback submitted", data: { id } });
        } catch (e: any) {
            console.error("[FEEDBACK CREATE] Error:", e);
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            console.log("[FEEDBACK GETALL] Fetching feedbacks...");
            const snapshot = await db.collection(FEEDBACK_COLLECTION).where("isDeleted", "==", false).get();
            const feedbacks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            console.log(`[FEEDBACK GETALL] Found ${feedbacks.length} feedbacks:`, feedbacks);
            return res.status(200).json({ success: true, data: feedbacks });
        } catch (e: any) {
            console.error("[FEEDBACK GETALL] Error:", e);
            return res.status(500).json({ success: false, message: e.message });
        }
    }
}
