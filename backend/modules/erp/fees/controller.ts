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
const FEES_STRUCTURE_COLLECTION = "feeStructures";
const FEES_ASSIGNMENT_COLLECTION = "feeAssignments";
const FEES_PAYMENT_COLLECTION = "feePayments";

export class FeesController {
    /**
     * CREATE FEE STRUCTURE
     * POST /api/erp/fees/structure
     */
    static async createStructure(req: Request, res: Response) {
        try {
            const {
                name,
                course,
                batch,
                academicYear,
                totalAmount,
                installments
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Fee structure name is required"
                });
            }

            const currentUserId = req.user?.userId || "system";
            const tenantId = req.user?.tenantId || "default_tenant";
            const id = randomUUID();
            const payload = {
                id,
                tenantId,
                name,
                course: course || "",
                batch: batch || "",
                academicYear: academicYear || "",
                totalAmount: totalAmount || 0,
                installments: installments || [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUserId,
                updatedBy: currentUserId,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(FEES_STRUCTURE_COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Fee structure created successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while creating fee structure"
            });
        }
    }

    /**
     * GET ALL FEE STRUCTURES
     * GET /api/erp/fees/structures
     */
    static async getStructures(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(FEES_STRUCTURE_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const structures = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: structures
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving fee structures"
            });
        }
    }

    /**
     * ASSIGN FEE TO STUDENT
     * POST /api/erp/fees/assign
     */
    static async assignToStudent(req: Request, res: Response) {
        try {
            const {
                studentId,
                structureId,
                totalAmount,
                discountAmount,
                scholarshipAmount,
                dueDate
            } = req.body;

            if (!studentId || !structureId) {
                return res.status(400).json({
                    success: false,
                    message: "Student ID and structure ID are required"
                });
            }

            const currentUserId = req.user?.userId || "system";
            const tenantId = req.user?.tenantId || "default_tenant";
            const id = randomUUID();
            const payload = {
                id,
                tenantId,
                studentId,
                structureId,
                totalAmount: totalAmount || 0,
                paidAmount: 0,
                discountAmount: discountAmount || 0,
                scholarshipAmount: scholarshipAmount || 0,
                dueDate: dueDate || "",
                status: "Pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUserId,
                updatedBy: currentUserId,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(FEES_PAYMENT_COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Fee assigned to student successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while assigning fee"
            });
        }
    }

    /**
     * GET STUDENT'S FEES
     * GET /api/erp/fees/student/:studentId
     */
    static async getStudentFees(req: Request, res: Response) {
        try {
            const { studentId } = req.params;

            const snapshot = await db.collection(FEES_PAYMENT_COLLECTION)
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();

            const payments = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: payments
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving student fees"
            });
        }
    }

    /**
     * RECORD FEE PAYMENT
     * POST /api/erp/fees/payment
     */
    static async recordPayment(req: Request, res: Response) {
        try {
            const {
                studentId,
                paymentId,
                amount,
                paymentMethod,
                transactionId,
                paymentDate
            } = req.body;

            if (!studentId || !amount) {
                return res.status(400).json({
                    success: false,
                    message: "Student ID and amount are required"
                });
            }

            const currentUserId = req.user?.userId || "system";
            const tenantId = req.user?.tenantId || "default_tenant";
            const id = randomUUID();
            const payload = {
                id,
                tenantId,
                studentId,
                paymentId: paymentId || "",
                amount,
                paymentMethod: paymentMethod || "",
                transactionId: transactionId || "",
                paymentDate: paymentDate || new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUserId
            };

            await db.collection("feePayments").doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Payment recorded successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while recording payment"
            });
        }
    }

    /**
     * GET ALL PAYMENTS
     * GET /api/erp/fees/payments
     */
    static async getAllPayments(req: Request, res: Response) {
        try {
            const { studentId, status } = req.query;

            let query = db.collection(FEES_PAYMENT_COLLECTION).where("isDeleted", "==", false);

            if (studentId) {
                query = query.where("studentId", "==", studentId);
            }
            if (status) {
                query = query.where("status", "==", status);
            }

            const snapshot = await query.get();

            const payments = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: payments
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving payments"
            });
        }
    }
}
