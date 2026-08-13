import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();
const ENQUIRIES_COLLECTION = "enquiries";

export class InquiryController {
    /**
     * SUBMIT GENERAL ENQUIRY (Public/Contact Us Page)
     * POST /api/crm/inquiry
     * Fields: name, phone, subject, message
     */
    static async create(req: Request, res: Response) {
        try {
            const { name, phone, subject, message } = req.body;

            if (!name || !phone || !message) {
                return res.status(400).json({
                    success: false,
                    message: "Name, Phone, and Message are required"
                });
            }

            const id = randomUUID();
            const submittedAt = admin.firestore.FieldValue.serverTimestamp();

            await db.collection(ENQUIRIES_COLLECTION).doc(id).set({
                id,
                name,
                phone,
                subject: subject || "",
                message,
                status: "pending",
                submittedAt,
                createdAt: submittedAt,
                updatedAt: submittedAt,
                isDeleted: false
            });

            // Update prospective leads status if they exist
            const leadQuery = await db.collection("leads").where("phone", "==", phone).where("isDeleted", "==", false).limit(1).get();
            if (!leadQuery.empty) {
                const batch = db.batch();
                leadQuery.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        status: "enquired",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
            }

            return res.status(201).json({
                success: true,
                message: "Enquiry submitted successfully",
                data: { id }
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * GET ALL ENQUIRIES (Admin)
     * GET /api/crm/inquiry
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { fromDate } = req.query;

            let snapshot = await db.collection(ENQUIRIES_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            let enquiries = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    submittedAt: data.submittedAt ? (data.submittedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                };
            });

            // Sort by createdAt descending
            enquiries.sort((a, b) => {
                const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tB - tA;
            });

            if (fromDate) {
                const from = new Date(fromDate as string).getTime();
                enquiries = enquiries.filter(e => {
                    const ts = e.createdAt ? new Date(e.createdAt).getTime() : 0;
                    return ts >= from;
                });
            }

            return res.status(200).json({ success: true, data: enquiries });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * UPDATE STATUS (Admin)
     * PATCH /api/crm/inquiry/:id
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const docRef = db.collection(ENQUIRIES_COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Enquiry not found" });
            }

            await docRef.update({
                status: status || "pending",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, message: "Enquiry status updated" });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * DELETE ENQUIRY (Admin - Soft delete)
     * DELETE /api/crm/inquiry/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(ENQUIRIES_COLLECTION).doc(id).update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ success: true, message: "Enquiry deleted" });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }
}
