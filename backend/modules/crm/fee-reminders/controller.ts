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
const REMINDERS_COLLECTION = "feeReminders";

export class FeeRemindersController {
    static async create(req: Request, res: Response) {
        try {
            const { studentId, message, dueDate, createdBy } = req.body;
            const id = randomUUID();
            await db.collection(REMINDERS_COLLECTION).doc(id).set({
                id, studentId, message, dueDate,
                status: "pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                isDeleted: false
            });
            return res.status(201).json({ success: true, message: "Reminder created", data: { id } });
        } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(REMINDERS_COLLECTION).where("isDeleted", "==", false).get();
            const reminders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            return res.status(200).json({ success: true, data: reminders });
        } catch (e: any) { return res.status(500).json({ success: false, message: e.message }); }
    }
}
