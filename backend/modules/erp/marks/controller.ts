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
const MARKS_COLLECTION = "marks";

function parseTimestamp(val: any): string | null {
    if (!val) return null;
    if (typeof val.toDate === "function") {
        try {
            return val.toDate().toISOString();
        } catch (_) {}
    }
    if (val instanceof Date) return val.toISOString();
    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString();
    } catch (_) {}
    return typeof val === "string" ? val : null;
}

export class MarksController {
    /**
     * CREATE/UPDATE MARKS
     * POST /api/erp/marks
     */
    static async createOrUpdate(req: Request, res: Response) {
        try {
            const {
                studentId,
                subject,
                examType,
                unitTest,
                midTerm,
                finalExam,
                practical,
                assignment,
                internalAssessment,
                totalMarks,
                percentage,
                gpa,
                grade,
                remarks,
                passFail,
                academicYear,
                createdBy
            } = req.body;

            if (!studentId || !subject) {
                return res.status(400).json({
                    success: false,
                    message: "Student ID and subject are required"
                });
            }

            const id = randomUUID();
            const payload = {
                id,
                studentId,
                subject,
                examType: examType || "",
                unitTest: unitTest || 0,
                midTerm: midTerm || 0,
                finalExam: finalExam || 0,
                practical: practical || 0,
                assignment: assignment || 0,
                internalAssessment: internalAssessment || 0,
                totalMarks: totalMarks || 0,
                percentage: percentage || 0,
                gpa: gpa || 0,
                grade: grade || "",
                remarks: remarks || "",
                passFail: passFail || "Pending",
                academicYear: academicYear || "",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(MARKS_COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Marks saved successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while saving marks"
            });
        }
    }

    /**
     * GET STUDENT'S MARKS
     * GET /api/erp/marks/student/:studentId
     */
    static async getStudentMarks(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { academicYear } = req.query;

            let query = db.collection(MARKS_COLLECTION)
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId);

            if (academicYear) {
                query = query.where("academicYear", "==", academicYear);
            }

            const snapshot = await query.get();

            const marks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt)
                };
            });

            return res.status(200).json({
                success: true,
                data: marks
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving marks"
            });
        }
    }

    /**
     * GET ALL MARKS (Admin/Staff)
     * GET /api/erp/marks
     */
    static async getAllMarks(req: Request, res: Response) {
        try {
            const { studentId, subject, academicYear } = req.query;

            let query = db.collection(MARKS_COLLECTION).where("isDeleted", "==", false);

            if (studentId) {
                query = query.where("studentId", "==", studentId);
            }
            if (subject) {
                query = query.where("subject", "==", subject);
            }
            if (academicYear) {
                query = query.where("academicYear", "==", academicYear);
            }

            const snapshot = await query.get();

            const marks = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt)
                };
            });

            return res.status(200).json({
                success: true,
                data: marks
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving marks"
            });
        }
    }

    /**
     * DELETE MARKS
     * DELETE /api/erp/marks/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            const docRef = db.collection(MARKS_COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Marks not found"
                });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin"
            });

            return res.status(200).json({
                success: true,
                message: "Marks deleted successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting marks"
            });
        }
    }
}
