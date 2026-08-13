import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();
const CAMPAIGNS_COLLECTION = "campaigns";

export class CampaignsController {
    /**
     * CREATE/UPDATE CAMPAIGN (Admin)
     * POST /api/crm/campaigns
     * targetUsers: "free" | "paid" | "both" | "all"
     * posterDisplay: "free_home" | "paid_dashboard" | "both" | null
     */
    static async createOrUpdateCampaign(req: Request, res: Response) {
        try {
            const {
                id,
                title,
                description,
                posterUrl,
                targetUsers,   // "free" | "paid" | "both" | "all"
                posterDisplay, // "free_home" | "paid_dashboard" | "both" | null
                isActive = true,
                showInDashboard = true,
                sendNotification = false,
                notificationMessage,
                scheduledFor,  // ISO datetime for scheduled campaigns
                courseId,      // optional: target users interested in a specific course
                courseName,
                createdBy
            } = req.body;

            if (!title) {
                return res.status(400).json({ success: false, message: "Title is required" });
            }

            const now = admin.firestore.FieldValue.serverTimestamp();
            let campaignId = id;

            if (campaignId) {
                const docRef = db.collection(CAMPAIGNS_COLLECTION).doc(campaignId);
                const doc = await docRef.get();
                if (!doc.exists || doc.data()?.isDeleted) {
                    return res.status(404).json({ success: false, message: "Campaign not found" });
                }
                await docRef.update({
                    title,
                    description: description || "",
                    posterUrl: posterUrl || "",
                    targetUsers: targetUsers || "all",
                    posterDisplay: posterDisplay || null,
                    isActive,
                    showInDashboard,
                    sendNotification,
                    notificationMessage: notificationMessage || "",
                    scheduledFor: scheduledFor || null,
                    courseId: courseId || null,
                    courseName: courseName || null,
                    updatedAt: now,
                    updatedBy: createdBy || "admin"
                });
                return res.status(200).json({ success: true, message: "Campaign updated", data: { campaignId } });
            }

            campaignId = randomUUID();
            await db.collection(CAMPAIGNS_COLLECTION).doc(campaignId).set({
                id: campaignId,
                title,
                description: description || "",
                posterUrl: posterUrl || "",
                targetUsers: targetUsers || "all",
                posterDisplay: posterDisplay || null,
                isActive,
                showInDashboard,
                sendNotification,
                notificationMessage: notificationMessage || "",
                scheduledFor: scheduledFor || null,
                courseId: courseId || null,
                courseName: courseName || null,
                createdAt: now,
                updatedAt: now,
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            });

            return res.status(201).json({ success: true, message: "Campaign created", data: { campaignId } });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET CAMPAIGNS FOR USER (Public - by user type)
     * GET /api/crm/campaigns?userType=free|paid|student
     * Also returns poster campaigns for the relevant display location
     */
    static async getCampaigns(req: Request, res: Response) {
        try {
            const { userType = "all", display } = req.query;

            const snapshot = await db.collection(CAMPAIGNS_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            let campaigns = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            // Filter active in-memory
            campaigns = campaigns.filter((c: any) => c.isActive === true);

            // Sort by createdAt desc in-memory
            campaigns.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            const filteredCampaigns = campaigns.filter((campaign: any) => {
                // Filter by target user type
                const tu = campaign.targetUsers;
                if (tu === "all" || tu === "both") return true;
                if (tu === "free" && (userType === "free" || userType === "guest")) return true;
                if (tu === "paid" && (userType === "paid" || userType === "student")) return true;
                if (tu === userType) return true;
                return false;
            }).filter((campaign: any) => {
                // Filter by display location if specified
                if (!display) return true;
                const pd = campaign.posterDisplay;
                if (!pd) return false;
                if (pd === "both") return true;
                return pd === display;
            });

            return res.status(200).json({ success: true, data: filteredCampaigns });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET ALL CAMPAIGNS (Admin)
     * GET /api/crm/campaigns/admin
     */
    static async getAdminCampaigns(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(CAMPAIGNS_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const campaigns = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            // Sort by createdAt desc in-memory
            campaigns.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            return res.status(200).json({ success: true, data: campaigns });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET POSTER CAMPAIGNS FOR DISPLAY LOCATION
     * GET /api/crm/campaigns/posters?location=free_home|paid_dashboard
     */
    static async getPosters(req: Request, res: Response) {
        try {
            const { location } = req.query;

            const snapshot = await db.collection(CAMPAIGNS_COLLECTION)
                .where("isDeleted", "==", false)
                .where("isActive", "==", true)
                .get();

            const posters = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            }).filter((c: any) => {
                if (!c.posterUrl) return false;
                if (!location) return true;
                const pd = c.posterDisplay;
                if (!pd) return false;
                if (pd === "both") return true;
                return pd === location;
            });

            return res.status(200).json({ success: true, data: posters });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE CAMPAIGN (Admin - Soft delete)
     * DELETE /api/crm/campaigns/:id
     */
    static async deleteCampaign(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const deletedBy = (req.query.deletedBy as string) || req.body.deletedBy;

            const docRef = db.collection(CAMPAIGNS_COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Campaign not found" });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin"
            });

            return res.status(200).json({ success: true, message: "Campaign deleted" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
