import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";

const db = admin.firestore();
const LEADS_COLLECTION = "leads";
const NOTIFICATIONS_COLLECTION = "lead_notifications";

export class LeadsController {
    /**
     * CREATE LEAD (auto or manual)
     * POST /api/crm/leads
     * Automatically called when a guest user logs in
     */
    static async create(req: Request, res: Response) {
        try {
            const { name, email, phone, source, notes, courseInterest, createdBy } = req.body;

            if (!name || !phone) {
                return res.status(400).json({
                    success: false,
                    message: "Name and Phone are required"
                });
            }

            // Check if lead already exists for this phone
            const existing = await db.collection(LEADS_COLLECTION)
                .where("phone", "==", phone)
                .where("isDeleted", "==", false)
                .limit(1)
                .get();

            if (!existing.empty) {
                const existingLead = existing.docs[0].data();
                // Update last seen
                await existing.docs[0].ref.update({
                    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
                    name: name || existingLead.name,
                    email: email || existingLead.email,
                    courseInterest: courseInterest || existingLead.courseInterest || []
                });
                return res.status(200).json({
                    success: true,
                    message: "Lead updated (existing)",
                    data: { id: existing.docs[0].id, isNew: false }
                });
            }

            const id = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            await db.collection(LEADS_COLLECTION).doc(id).set({
                id,
                name,
                email: email || "",
                phone,
                source: source || "guest_login",
                notes: notes || "",
                courseInterest: courseInterest || [],
                status: "new",
                registeredAt: now,
                lastSeenAt: now,
                createdAt: now,
                updatedAt: now,
                isDeleted: false,
                createdBy: createdBy || "system"
            });

            return res.status(201).json({
                success: true,
                message: "Lead registered",
                data: { id, isNew: true }
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * GET ALL LEADS (Admin)
     * GET /api/crm/leads
     * Query: fromDate, toDate, status
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { fromDate, toDate, status } = req.query;

            const snapshot = await db.collection(LEADS_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            let leads = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    registeredAt: data.registeredAt ? (data.registeredAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    lastSeenAt: data.lastSeenAt ? (data.lastSeenAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                };
            });

            // Sort in-memory to prevent missing Firestore index requirements
            leads.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            });

            // Filter by date
            if (fromDate) {
                const from = new Date(fromDate as string).getTime();
                leads = leads.filter(l => l.createdAt ? new Date(l.createdAt).getTime() >= from : false);
            }
            if (toDate) {
                const to = new Date(toDate as string).getTime();
                leads = leads.filter(l => l.createdAt ? new Date(l.createdAt).getTime() <= to : true);
            }
            if (status) {
                leads = leads.filter((l: any) => l.status === status);
            }

            return res.status(200).json({ success: true, data: leads });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * SEND NOTIFICATION TO LEAD(S) (Admin)
     * POST /api/crm/leads/notify
     * Body: { leadIds: string[], message: string, title: string, targetAll?: boolean }
     */
    static async sendNotification(req: Request, res: Response) {
        try {
            const { leadIds, message, title, targetAll, sentBy } = req.body;

            if (!message || !title) {
                return res.status(400).json({
                    success: false,
                    message: "Title and message are required"
                });
            }

            let targetLeadIds: string[] = leadIds || [];

            if (targetAll) {
                const snapshot = await db.collection(LEADS_COLLECTION)
                    .where("isDeleted", "==", false)
                    .get();
                targetLeadIds = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }) as any)
                    .filter(lead => lead.status !== "converted")
                    .map(lead => lead.id);
            }

            if (targetLeadIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No leads selected for notification"
                });
            }

            const notificationId = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            // Store notification record
            await db.collection(NOTIFICATIONS_COLLECTION).doc(notificationId).set({
                id: notificationId,
                title,
                message,
                targetLeadIds,
                targetAll: targetAll || false,
                sentCount: targetLeadIds.length,
                sentBy: sentBy || "admin",
                sentAt: now,
                createdAt: now
            });

            // Store notification in each lead's sub-collection for retrieval
            const batch = db.batch();
            for (const leadId of targetLeadIds) {
                const notifRef = db.collection(LEADS_COLLECTION).doc(leadId)
                    .collection("notifications").doc(notificationId);
                batch.set(notifRef, {
                    id: notificationId,
                    title,
                    message,
                    read: false,
                    sentAt: now
                });
            }
            await batch.commit();

            return res.status(200).json({
                success: true,
                message: `Notification sent to ${targetLeadIds.length} lead(s)`,
                data: { notificationId, count: targetLeadIds.length }
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * GET LEAD NOTIFICATIONS (for a specific guest user by phone)
     * GET /api/crm/leads/:leadId/notifications
     */
    static async getLeadNotifications(req: Request, res: Response) {
        try {
            const { leadId } = req.params;

            const snapshot = await db.collection(LEADS_COLLECTION).doc(leadId)
                .collection("notifications")
                .orderBy("sentAt", "desc")
                .get();

            const notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    sentAt: data.sentAt ? (data.sentAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            return res.status(200).json({ success: true, data: notifications });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * UPDATE LEAD STATUS (Admin)
     * PATCH /api/crm/leads/:id
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status, notes, updatedBy } = req.body;

            await db.collection(LEADS_COLLECTION).doc(id).update({
                status: status || "new",
                notes: notes || "",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: updatedBy || "admin"
            });

            return res.status(200).json({ success: true, message: "Lead updated" });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * UPDATE COURSE INTEREST (Guest User)
     * POST /api/crm/leads/:leadId/interest
     * Body: { courseId: string, courseName: string }
     */
    static async addCourseInterest(req: Request, res: Response) {
        try {
            const { leadId } = req.params;
            const { courseId, courseName } = req.body;

            const docRef = db.collection(LEADS_COLLECTION).doc(leadId);
            const doc = await docRef.get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Lead not found" });
            }

            const existing = doc.data()?.courseInterest || [];
            if (!existing.find((c: any) => c.courseId === courseId)) {
                existing.push({ courseId, courseName, interestedAt: new Date().toISOString() });
                await docRef.update({
                    courseInterest: existing,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return res.status(200).json({ success: true, message: "Course interest recorded" });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * GUEST LOGIN (Create/Find lead by email - email-only login)
     * POST /api/crm/leads/guest-login
     * Body: { email } — name and phone are optional (collected later via Application Portal)
     */
    static async guestLogin(req: Request, res: Response) {
        try {
            const { email, name, phone } = req.body;

            if (!email || !email.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Email address is required"
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address"
                });
            }

            const cleanEmail = email.trim().toLowerCase();

            // Check if guest already registered by email
            const existing = await db.collection(LEADS_COLLECTION)
                .where("email", "==", cleanEmail)
                .where("isDeleted", "==", false)
                .limit(1)
                .get();

            let leadId: string;
            let isNew = false;
            let leadData: any = {};

            if (!existing.empty) {
                const doc = existing.docs[0];
                leadId = doc.id;
                leadData = doc.data() || {};

                // Block login if name/phone are explicitly passed but differ from inputs (robust comparison)
                const existingName = (leadData.name || "").trim().toLowerCase();
                const existingPhone = (leadData.phone || "").trim().replace(/\D/g, "");
                const inputName = (name || "").trim().toLowerCase();
                const inputPhone = (phone || "").trim().replace(/\D/g, "");

                const emailPrefix = cleanEmail.split("@")[0].toLowerCase();
                const isDefaultName = existingName === emailPrefix || existingName === "";
                const isPhoneEmpty = existingPhone === "";

                const existingPhoneLast10 = existingPhone.slice(-10);
                const inputPhoneLast10 = inputPhone.slice(-10);
                const phoneMatches = existingPhoneLast10 === inputPhoneLast10;

                const nameMatches = existingName === inputName || existingName.includes(inputName) || inputName.includes(existingName);

                // ONLY block if both inputName and inputPhone are explicitly provided (not empty)
                if (inputName && inputPhone && !isDefaultName && !isPhoneEmpty && (!nameMatches || !phoneMatches)) {
                    return res.status(400).json({
                        success: false,
                        message: "This Google account is already registered with a different name or contact number."
                    });
                }

                // Update last seen; optionally update name/phone if they were empty or matched
                const updates: any = {
                    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                if (name && name.trim()) updates.name = name.trim();
                if (phone && phone.trim()) updates.phone = phone.trim();
                await doc.ref.update(updates);
                if (name) leadData.name = name.trim();
                if (phone) leadData.phone = phone.trim();
            } else {
                leadId = randomUUID();
                isNew = true;
                const now = admin.firestore.FieldValue.serverTimestamp();
                // Derive a display name from the email prefix if no name provided
                const displayName = (name && name.trim()) || cleanEmail.split("@")[0];
                leadData = {
                    id: leadId,
                    name: displayName,
                    email: cleanEmail,
                    phone: (phone && phone.trim()) || "",
                    source: "guest_login",
                    notes: "",
                    courseInterest: [],
                    status: "new",
                    registeredAt: now,
                    lastSeenAt: now,
                    createdAt: now,
                    updatedAt: now,
                    isDeleted: false,
                    createdBy: "guest"
                };
                await db.collection(LEADS_COLLECTION).doc(leadId).set(leadData);
            }

            // Check if this guest has already submitted an admission application
            const admissionSnapshot = await db.collection("admissions")
                .where("email", "==", cleanEmail)
                .where("isDeleted", "==", false)
                .limit(1)
                .get();

            const hasApplied = !admissionSnapshot.empty;
            const displayName = leadData.name || cleanEmail.split("@")[0];

            const token = jwt.sign(
                {
                    userId: leadId,
                    user_id: leadId,
                    email: cleanEmail,
                    name: displayName,
                    role: "guest",
                    tenantId: "default_tenant"
                },
                env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                success: true,
                message: isNew ? "Welcome! Guest session started." : "Welcome back!",
                data: {
                    leadId,
                    name: displayName,
                    phone: leadData.phone || "",
                    email: cleanEmail,
                    role: "guest",
                    isNew,
                    hasApplied,
                    token,
                    hallTicketGenerated: leadData.hallTicketGenerated || false,
                    hallTicketExamName: leadData.hallTicketExamName || "",
                    hallTicketExamDate: leadData.hallTicketExamDate || "",
                    hallTicketVenue: leadData.hallTicketVenue || "",
                    hallTicketTime: leadData.hallTicketTime || "",
                    hallTicketInstructions: leadData.hallTicketInstructions || ""
                }
            });
        } catch (e: any) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }
}
