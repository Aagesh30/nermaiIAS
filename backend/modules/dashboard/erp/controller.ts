import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class ERPDashboardController {
    static async getOverview(req: Request, res: Response) {
        try {
            const studentsSnapshot = await db.collection("students").where("isDeleted", "==", false).get();
            const staffSnapshot = await db.collection("staff").where("isDeleted", "==", false).get();
            const feesSnapshot = await db.collection("feePayments").where("isDeleted", "==", false).get();

            // Calculate fee stats
            let totalCollected = 0;
            let pendingAmount = 0;
            feesSnapshot.docs.forEach(doc => {
                const fee = doc.data();
                if (fee.status === "Paid") {
                    totalCollected += fee.amount || 0;
                } else {
                    pendingAmount += fee.amount || 0;
                }
            });

            return res.status(200).json({
                success: true,
                data: {
                    studentStats: {
                        total: studentsSnapshot.size,
                        active: studentsSnapshot.size,
                        newThisMonth: 12
                    },
                    staffStats: {
                        total: staffSnapshot.size,
                        teaching: Math.floor(staffSnapshot.size * 0.7),
                        nonTeaching: Math.floor(staffSnapshot.size * 0.3)
                    },
                    feeStats: {
                        totalCollected,
                        pendingAmount,
                        dueThisMonth: pendingAmount * 0.3
                    },
                    recentActivities: [
                        { type: "admission", message: "New admission: John Doe", time: new Date().toISOString() },
                        { type: "payment", message: "Fee payment received: ₹15,000", time: new Date().toISOString() },
                        { type: "marks", message: "Mid-term marks uploaded for Batch 2024", time: new Date().toISOString() }
                    ]
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching ERP dashboard"
            });
        }
    }

    static async getStudentStats(req: Request, res: Response) {
        try {
            return res.status(200).json({
                success: true,
                data: {
                    batchWise: {
                        "2021": 45,
                        "2022": 52,
                        "2023": 59,
                        "2024": 38
                    },
                    courseWise: {
                        "UPSC": 78,
                        "MPPSC": 62,
                        "SSC": 54
                    },
                    genderWise: {
                        male: 108,
                        female: 86
                    }
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching student stats"
            });
        }
    }
}
