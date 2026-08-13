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
const ID_CARD_COLLECTION = "idCards";

export class IDCardController {
    /**
     * GENERATE ID CARD
     * POST /api/erp/id-card
     */
    static async generate(req: Request, res: Response) {
        try {
            const {
                userId,
                userType, // "student", "staff", "hall_ticket"
                cardNumber,
                issueDate,
                expiryDate,
                createdBy
            } = req.body;

            if (!userId || !userType) {
                return res.status(400).json({
                    success: false,
                    message: "User ID and user type are required"
                });
            }

            const id = randomUUID();
            const payload = {
                id,
                userId,
                userType,
                cardNumber: cardNumber || id,
                issueDate: issueDate || new Date().toISOString(),
                expiryDate: expiryDate || "",
                qrCodeData: JSON.stringify({ userId, userType, cardNumber, id }),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(ID_CARD_COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "ID card generated successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while generating ID card"
            });
        }
    }

    /**
     * GET ID CARDS BY USER
     * GET /api/erp/id-card/user/:userId
     */
    static async getByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            const snapshot = await db.collection(ID_CARD_COLLECTION)
                .where("isDeleted", "==", false)
                .where("userId", "==", userId)
                .get();

            const cards = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: cards
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving ID cards"
            });
        }
    }

    /**
     * GET ALL ID CARDS (Admin)
     * GET /api/erp/id-card
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { userType } = req.query;

            let query = db.collection(ID_CARD_COLLECTION).where("isDeleted", "==", false);

            if (userType) {
                query = query.where("userType", "==", userType);
            }

            const snapshot = await query.get();

            const cards = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: cards
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving ID cards"
            });
        }
    }
}
