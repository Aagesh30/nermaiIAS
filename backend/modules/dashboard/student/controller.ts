import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class StudentDashboardController {
    private static async resolveStudentId(req: Request): Promise<string | null> {
        let studentId: string | undefined | null = req.params.studentId;
        if (!studentId || studentId === 'overview' || studentId === 'marks' || studentId === 'fees') {
            studentId = req.user?.studentId;
            if (!studentId && req.user?.userId) {
                const userDoc = await db.collection("users").doc(req.user.userId).get();
                if (userDoc.exists) {
                    studentId = userDoc.data()?.studentId;
                }
            }
            if (!studentId) {
                studentId = req.user?.userId;
            }
        }
        return studentId || null;
    }

    static async getOverview(req: Request, res: Response) {
        try {
            const studentId = await StudentDashboardController.resolveStudentId(req);
            if (!studentId) {
                return res.status(200).json({ success: true, data: { student: {}, academicStats: {}, feeStats: {}, upcomingEvents: [], recentActivities: [], liveClasses: [] } });
            }

            // Get student details — first try direct doc lookup, then fallback to userId field query
            let studentDoc = await db.collection("students").doc(studentId).get();
            let student: any = studentDoc.exists ? studentDoc.data() : null;

            // Fallback: query by userId field (for Firebase-authenticated students whose doc id differs from uid)
            if (!student || student.isDeleted) {
                const byUserId = await db.collection("students")
                    .where("userId", "==", studentId)
                    .where("isDeleted", "==", false)
                    .limit(1)
                    .get();
                if (!byUserId.empty) {
                    student = byUserId.docs[0].data();
                }
            }

            // If still not found, return graceful empty dashboard (student exists in auth but no profile yet)
            if (!student || student.isDeleted) {
                const liveClasses: any[] = [];
                try {
                    const { LiveSessionService } = require("../../../live-sessions/service");
                    const { LiveSessionResolver } = require("../../../live-sessions/LiveSessionResolver");
                    const rawLiveClasses = await LiveSessionService.getStudentLiveSessions(studentId, req.user?.tenantId || 'default_tenant');
                    for (const item of rawLiveClasses) {
                        const resolved = await LiveSessionResolver.resolveActiveSession(item.classId);
                        const baseStart = new Date(item.scheduledStartTime || 0).getTime();
                        liveClasses.push({
                            id: resolved.sessionId || item.id,
                            classId: item.classId,
                            title: item.title,
                            startTime: item.scheduledStartTime,
                            provider: resolved.provider,
                            courseId: item.courseId || '',
                            liveStatus: resolved.status,
                            status: resolved.status,
                            joinAllowed: resolved.joinAllowed,
                            remainingSeconds: Math.max(0, Math.floor((baseStart - Date.now()) / 1000)),
                            subjectName: item.subjectName || ''
                        });
                    }
                } catch (err) {
                    console.error("Error fetching live classes (no student profile):", err);
                }
                return res.status(200).json({
                    success: true,
                    data: { student: {}, academicStats: { avgPercentage: 0, totalSubjects: 0, topSubject: "N/A" }, feeStats: { pendingFees: 0, totalPaid: 0, totalInstallments: 0 }, upcomingEvents: [], recentActivities: [], liveClasses }
                });
            }

            // Get student marks
            const marksSnapshot = await db.collection("marks")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();
            const marks = marksSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Get student fees
            const feesSnapshot = await db.collection("feePayments")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();
            const fees = feesSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            // Calculate stats
            const avgPercentage = marks.length > 0
                ? (marks.reduce((sum, m) => sum + ((m as any).percentage || 0), 0) / marks.length).toFixed(1)
                : 0;

            const pendingFees = fees.filter(f => (f as any).status !== "Paid").length;
            const totalPaid = fees.filter(f => (f as any).status === "Paid").length;

            // Fetch live classes for student
            const liveClasses: any[] = [];
            try {
                const { LiveSessionService } = require("../../../live-sessions/service");
                const { LiveSessionResolver } = require("../../../live-sessions/LiveSessionResolver");
                
                const rawLiveClasses = await LiveSessionService.getStudentLiveSessions(studentId, req.user?.tenantId || 'default_tenant');
                
                for (const item of rawLiveClasses) {
                    const resolved = await LiveSessionResolver.resolveActiveSession(item.classId);
                    
                    const baseStart = new Date(item.scheduledStartTime || 0).getTime();
                    const durationMs = 60 * 60 * 1000;
                    const effectiveEnd = baseStart + durationMs;
                    const currentNow = Date.now();
                    let remainingSeconds = 0;
                    if (['JOINING', 'HOST_CONNECTED', 'LIVE'].includes(resolved.status)) {
                        remainingSeconds = Math.max(0, Math.floor((effectiveEnd - currentNow) / 1000));
                    } else if (resolved.status === 'SCHEDULED') {
                        remainingSeconds = Math.max(0, Math.floor((baseStart - currentNow) / 1000));
                    }

                    liveClasses.push({
                        id: resolved.sessionId || item.id,
                        classId: item.classId,
                        title: item.title,
                        startTime: item.scheduledStartTime,
                        provider: resolved.provider,
                        courseId: item.courseId || '',
                        liveStatus: resolved.status,
                        status: resolved.status,
                        joinAllowed: resolved.joinAllowed,
                        remainingSeconds,
                        subjectName: item.subjectName || ''
                    });
                }
            } catch (err) {
                console.error("Error fetching live classes for student dashboard:", err);
            }

            return res.status(200).json({
                success: true,
                data: {
                    student: {
                        id: (student as any).id,
                        name: `${(student as any).firstName || ''} ${(student as any).lastName || ''}`.trim() || (student as any).fullName || (student as any).name || '',
                        rollNumber: (student as any).rollNumber,
                        batch: (student as any).batch,
                        course: (student as any).course,
                        photoUrl: (student as any).photoUrl
                    },
                    academicStats: {
                        avgPercentage,
                        totalSubjects: marks.length,
                        topSubject: (marks[0] as any)?.subject || "N/A"
                    },
                    feeStats: {
                        pendingFees,
                        totalPaid,
                        totalInstallments: fees.length
                    },
                    upcomingEvents: [
                        { title: "Unit Test - History", date: new Date(Date.now() + 86400000 * 3).toISOString(), type: "exam" },
                        { title: "Parent-Teacher Meeting", date: new Date(Date.now() + 86400000 * 7).toISOString(), type: "meeting" }
                    ],
                    recentActivities: [
                        { type: "marks", message: "Mid-term marks published", time: new Date(Date.now() - 86400000 * 2).toISOString() },
                        { type: "fee", message: "Fee installment paid", time: new Date(Date.now() - 86400000 * 5).toISOString() }
                    ],
                    liveClasses
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching student dashboard"
            });
        }
    }

    static async getMarks(req: Request, res: Response) {
        try {
            const studentId = await StudentDashboardController.resolveStudentId(req);
            if (!studentId) {
                return res.status(400).json({ success: false, message: "studentId is required" });
            }

            const marksSnapshot = await db.collection("marks")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .get();

            const marks = marksSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));

            return res.status(200).json({
                success: true,
                data: marks
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching marks"
            });
        }
    }

    static async getFeeHistory(req: Request, res: Response) {
        try {
            const studentId = await StudentDashboardController.resolveStudentId(req);
            if (!studentId) {
                return res.status(400).json({ success: false, message: "studentId is required" });
            }

            const feesSnapshot = await db.collection("feePayments")
                .where("isDeleted", "==", false)
                .where("studentId", "==", studentId)
                .orderBy("createdAt", "desc")
                .get();

            const fees = feesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({
                success: true,
                data: fees
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching fee history"
            });
        }
    }
}
