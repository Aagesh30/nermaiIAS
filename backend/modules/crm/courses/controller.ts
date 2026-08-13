import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();
const COURSES_COLLECTION = "courses";

export class CoursesController {
    /**
     * GET ALL COURSES (Public)
     * GET /api/crm/courses
     */
    static async getAll(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(COURSES_COLLECTION)
                .where("isDeleted", "==", false)
                .where("isActive", "==", true)
                .get();

            const courses = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            // Sort in memory locally by createdAt desc
            courses.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            });

            return res.status(200).json({ success: true, data: courses });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * CREATE/UPDATE COURSE (Admin)
     * POST /api/crm/courses
     */
    static async createOrUpdate(req: Request, res: Response) {
        try {
            const { id, name, description, duration, fee, category, isActive = true, createdBy } = req.body;

            if (!name) {
                return res.status(400).json({ success: false, message: "Course name is required" });
            }

            const now = admin.firestore.FieldValue.serverTimestamp();

            if (id) {
                const docRef = db.collection(COURSES_COLLECTION).doc(id);
                const doc = await docRef.get();
                if (!doc.exists) {
                    return res.status(404).json({ success: false, message: "Course not found" });
                }
                await docRef.update({
                    name, description: description || "", duration: duration || "",
                    fee: fee || 0, category: category || "general", isActive,
                    updatedAt: now, updatedBy: createdBy || "admin"
                });
                return res.status(200).json({ success: true, message: "Course updated", data: { id } });
            }

            const courseId = randomUUID();
            await db.collection(COURSES_COLLECTION).doc(courseId).set({
                id: courseId, name,
                description: description || "",
                duration: duration || "",
                fee: fee || 0,
                category: category || "general",
                isActive,
                interestedCount: 0,
                createdAt: now, updatedAt: now,
                createdBy: createdBy || "admin",
                isDeleted: false
            });

            return res.status(201).json({ success: true, message: "Course created", data: { id: courseId } });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * MARK INTEREST IN COURSE (Guest User)
     * POST /api/crm/courses/:courseId/interest
     * Body: { leadId: string, leadName: string, phone: string }
     */
    static async markInterest(req: Request, res: Response) {
        try {
            const { courseId } = req.params;
            const { leadId, leadName, phone, email } = req.body;

            if (!leadId) {
                return res.status(400).json({ success: false, message: "leadId is required" });
            }

            const courseDoc = await db.collection(COURSES_COLLECTION).doc(courseId).get();
            if (!courseDoc.exists) {
                return res.status(404).json({ success: false, message: "Course not found" });
            }

            const courseName = courseDoc.data()?.name || courseId;

            // Store interest in a sub-collection
            const interestDocId = `${courseId}_${leadId}`;
            const interestRef = db.collection("course_interests").doc(interestDocId);
            const existing = await interestRef.get();

            if (existing.exists) {
                return res.status(200).json({
                    success: true,
                    message: "Interest already recorded",
                    data: { alreadyInterested: true }
                });
            }

            const now = admin.firestore.FieldValue.serverTimestamp();
            await interestRef.set({
                id: interestDocId,
                courseId,
                courseName,
                leadId,
                leadName: leadName || "",
                phone: phone || "",
                email: email || "",
                interestedAt: now,
                createdAt: now
            });

            // Increment course interested count
            await db.collection(COURSES_COLLECTION).doc(courseId).update({
                interestedCount: admin.firestore.FieldValue.increment(1)
            });

            // Also update the lead's courseInterest array
            const leadRef = db.collection("leads").doc(leadId);
            const leadDoc = await leadRef.get();
            if (leadDoc.exists) {
                const courseInterest = leadDoc.data()?.courseInterest || [];
                if (!courseInterest.find((c: any) => c.courseId === courseId)) {
                    courseInterest.push({ courseId, courseName, interestedAt: new Date().toISOString() });
                    await leadRef.update({ courseInterest, updatedAt: now });
                }
            }

            return res.status(200).json({
                success: true,
                message: "Interest in course recorded",
                data: { courseId, courseName, leadId }
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * GET COURSE INTERESTS (Admin - for campaign targeting)
     * GET /api/crm/courses/:courseId/interests
     */
    static async getCourseInterests(req: Request, res: Response) {
        try {
            const { courseId } = req.params;

            const snapshot = await db.collection("course_interests")
                .where("courseId", "==", courseId)
                .orderBy("interestedAt", "desc")
                .get();

            const interests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    interestedAt: data.interestedAt ? (data.interestedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({ success: true, data: interests });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * DELETE COURSE (Admin - Soft delete)
     * DELETE /api/crm/courses/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(COURSES_COLLECTION).doc(id).update({
                isDeleted: true,
                isActive: false,
                deletedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ success: true, message: "Course deleted" });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }
}
