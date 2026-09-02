import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

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

export class AnalyticsController {
    /**
     * GET ADMIN DASHBOARD ANALYTICS
     * GET /api/erp/analytics/admin
     */
    static async getAdminAnalytics(req: Request, res: Response) {
        try {
            // Get student count
            const studentsSnapshot = await db.collection("students")
                .where("isDeleted", "==", false)
                .get();
            const totalStudents = studentsSnapshot.size;

            // Get staff count
            const staffSnapshot = await db.collection("staff")
                .where("isDeleted", "==", false)
                .get();
            const totalStaff = staffSnapshot.size;

            // Get fee payments (simplified)
            const paymentsSnapshot = await db.collection("feePayments")
                .where("isDeleted", "==", false)
                .get();
            const totalPayments = paymentsSnapshot.size;

            // Calculate total revenue (simplified)
            let totalRevenue = 0;
            paymentsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                totalRevenue += data.amount || 0;
            });

            const analytics = {
                totalStudents,
                totalStaff,
                totalPayments,
                totalRevenue,
                timestamp: new Date().toISOString()
            };

            return res.status(200).json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving analytics"
            });
        }
    }

    /**
     * GET STUDENT PERSONAL ANALYTICS
     * GET /api/erp/analytics/student/:studentId
     */
    static async getStudentAnalytics(req: Request, res: Response) {
        try {
            const { studentId } = req.params;

            // Get student details
            const studentDoc = await db.collection("students").doc(studentId).get();
            if (!studentDoc.exists || studentDoc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            // Get student's marks
            const marksSnapshot = await db.collection("marks")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();

            const marksData = marksSnapshot.docs.map(doc => doc.data());

            // Calculate average GPA/percentage
            let totalPercentage = 0;
            let avgPercentage = 0;
            if (marksData.length > 0) {
                totalPercentage = marksData.reduce((sum, mark) => sum + (mark.percentage || 0), 0);
                avgPercentage = totalPercentage / marksData.length;
            }

            // Get fee status
            const feesSnapshot = await db.collection("feePayments")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();

            const feesData = feesSnapshot.docs.map(doc => doc.data());
            const pendingFees = feesData.filter(f => f.status !== "Paid").length;

            const analytics = {
                student: {
                    ...studentDoc.data(),
                    createdAt: parseTimestamp(studentDoc.data()?.createdAt),
                    updatedAt: parseTimestamp(studentDoc.data()?.updatedAt)
                },
                marks: marksData,
                averagePercentage: avgPercentage.toFixed(2),
                pendingFees,
                totalSubjects: marksData.length,
                timestamp: new Date().toISOString()
            };

            return res.status(200).json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving student analytics"
            });
        }
    }
}
