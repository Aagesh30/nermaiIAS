import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class AdminDashboardController {
    static async getOverview(req: Request, res: Response) {
        try {
            // Get counts
            const studentsSnapshot = await db.collection("students").where("isDeleted", "==", false).get();
            const staffSnapshot = await db.collection("staff").where("isDeleted", "==", false).get();
            const admissionsSnapshot = await db.collection("admissions").where("isDeleted", "==", false).get();
            const leadsSnapshot = await db.collection("leads").where("isDeleted", "==", false).get();
            const paymentsSnapshot = await db.collection("feePayments").where("isDeleted", "==", false).get();

            // Calculate total revenue (simplified)
            let totalRevenue = 0;
            paymentsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                totalRevenue += data.amount || 0;
            });

            // Get recent activities
            const recentActivities = [
                { type: "student", message: "New student registered", time: new Date().toISOString() },
                { type: "payment", message: "Fee payment received", time: new Date().toISOString() },
                { type: "lead", message: "New lead added", time: new Date().toISOString() }
            ];

            return res.status(200).json({
                success: true,
                data: {
                    stats: {
                        totalStudents: studentsSnapshot.size,
                        totalStaff: staffSnapshot.size,
                        totalAdmissions: admissionsSnapshot.size,
                        totalLeads: leadsSnapshot.size,
                        totalRevenue,
                        totalPayments: paymentsSnapshot.size
                    },
                    recentActivities
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching admin dashboard"
            });
        }
    }

    static async getQuickStats(req: Request, res: Response) {
        try {
            return res.status(200).json({
                success: true,
                data: {
                    activeStudents: 156,
                    pendingPayments: 23,
                    todayAdmissions: 5,
                    newLeads: 12
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching quick stats"
            });
        }
    }
}
