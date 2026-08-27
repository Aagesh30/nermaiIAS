import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { env } from "../../../config/env";

const db = admin.firestore();
const CONTENT_COLLECTION = "dailyContent";

import { uploadFileToGoogleDrive, deleteFileFromGoogleDrive } from "../../../services/google_drive";

export class DailyContentController {
    /**
     * CREATE DAILY CONTENT (Admin/Staff)
     * POST /api/lms/daily-content
     */
    static async createDailyContent(req: Request, res: Response) {
        try {
            const {
                title,
                type,           // "image" | "pdf"
                source,         // "url" | "file"
                url,            // optional, for URL upload
                fileBase64,     // optional, for direct file upload (data URL or base64)
                fileName,       // optional, e.g. "Affairs_August_10.pdf"
                date,           // YYYY-MM-DD
                targetAudience, // "all" | "paid" | "batch"
                targetBatch,    // optional specific batch name e.g. "Batch 43"
                description,    // optional brief summary
                createdBy
            } = req.body;

            if (!title || !type || !source || !date) {
                return res.status(400).json({
                    success: false,
                    message: "title, type, source, and date are required fields"
                });
            }

            if (source === "url" && !url) {
                return res.status(400).json({
                    success: false,
                    message: "URL is required when source is 'url'"
                });
            }

            if (source === "file" && !fileBase64) {
                return res.status(400).json({
                    success: false,
                    message: "File payload is required when source is 'file'"
                });
            }

            const contentId = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            const payload: any = {
                id: contentId,
                title,
                type,
                source,
                date,
                targetAudience: targetAudience || "all",
                targetBatch: targetBatch || null,
                description: description || null,
                fileName: fileName || null,
                createdAt: now,
                updatedAt: now,
                createdBy: createdBy || "admin",
                isDeleted: false,
                status: req.body.status || "approved"
            };

            if (source === "url") {
                payload.url = url;
            } else if (source === "file" && fileBase64) {
                // Parse base64 and upload to Google Drive, Firebase Storage, or Cloudinary
                let pureBase64 = fileBase64;
                let detectedMime = type === "image" ? "image/jpeg" : "application/pdf";

                if (fileBase64.startsWith("data:")) {
                    const commaIdx = fileBase64.indexOf(",");
                    const mimeMatch = fileBase64.substring(0, commaIdx).match(/data:(.*?);base64/);
                    if (mimeMatch && mimeMatch[1]) {
                        detectedMime = mimeMatch[1];
                    }
                    pureBase64 = fileBase64.substring(commaIdx + 1);
                }

                const fileBuffer = Buffer.from(pureBase64, "base64");
                const safeFileTitle = (title || "content").replace(/[^a-zA-Z0-9_-]/g, "_");
                const ext = type === "image" ? "jpg" : "pdf";
                const targetFileName = fileName || `Daily_${date}_${safeFileTitle}.${ext}`;

                // Try Google Drive first
                try {
                    const driveUpload = await uploadFileToGoogleDrive({
                        fileName: targetFileName,
                        mimeType: detectedMime,
                        buffer: fileBuffer,
                        subPath: "LMS/Daily Content"
                    });

                    if (driveUpload && driveUpload.previewUrl) {
                        payload.url = driveUpload.previewUrl;
                        payload.googleDriveFileId = driveUpload.fileId;
                        payload.googleDriveWebViewLink = driveUpload.webViewLink;
                        payload.source = "drive";
                        console.log(`✅ Daily content synced to Google Drive: ${payload.url}`);
                    }
                } catch (driveErr: any) {
                    console.warn("Google Drive upload skipped/failed:", driveErr?.message);
                }

                // If Google Drive fails, fall back to Local Storage first for reliable local testing
                if (!payload.url || payload.url.startsWith("http://localhost")) {
                    try {
                        const fs = require("fs");
                        const path = require("path");
                        const publicUploadsDir = path.resolve(process.cwd(), "public", "uploads", "daily_content");
                        if (!fs.existsSync(publicUploadsDir)) {
                            fs.mkdirSync(publicUploadsDir, { recursive: true });
                        }
                        const safeDiskName = `${contentId}_${targetFileName}`;
                        const diskFilePath = path.join(publicUploadsDir, safeDiskName);
                        fs.writeFileSync(diskFilePath, fileBuffer);
                        payload.url = `/uploads/daily_content/${safeDiskName}`;
                        payload.source = "local";
                        console.log(`✅ Saved locally: ${payload.url}`);
                    } catch (fsErr: any) {
                        console.warn("Local storage fallback failed, trying other cloud fallbacks:", fsErr?.message);
                    }
                }

                // If both Google Drive and Local Storage fail, fall back to Firebase Storage and Cloudinary
                if (!payload.url) {
                    // Fallback 1: Firebase Storage (using appspot.com default bucket)
                    try {
                        const bucketName = env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.appspot.com`;
                        const bucket = admin.storage().bucket(bucketName);
                        const storagePath = `daily_content/${contentId}/${targetFileName}`;
                        const fileRef = bucket.file(storagePath);
                        await fileRef.save(fileBuffer, {
                            metadata: { contentType: detectedMime }
                        });
                        await fileRef.makePublic();
                        const publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
                        payload.url = publicUrl;
                        payload.source = "storage";
                        console.log(`✅ Daily content uploaded to Firebase Storage: ${payload.url}`);
                    } catch (storageErr: any) {
                        console.warn("Firebase Storage failed, trying Cloudinary raw fallback:", storageErr?.message);

                        // Fallback 2: Cloudinary Raw upload (no 401 delivery restrictions on raw files)
                        try {
                            const { v2: cloudinary } = require("cloudinary");
                            cloudinary.config({
                                cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "a75kib8t",
                                api_key: process.env.CLOUDINARY_API_KEY || "142513215157686",
                                api_secret: process.env.CLOUDINARY_API_SECRET || "YuaiR_Syak23RHTGvMvK53KVU24",
                                secure: true
                            });

                            const dataUri = `data:${detectedMime};base64,${pureBase64}`;
                            const cldResult = await cloudinary.uploader.upload(dataUri, {
                                folder: "nermai-ias/daily-content",
                                public_id: `daily_${date}_${safeFileTitle}_${contentId.substring(0, 8)}.${ext}`,
                                resource_type: type === "image" ? "image" : "raw",
                                overwrite: true
                            });

                            payload.url = cldResult.secure_url || cldResult.url;
                            payload.source = "cloudinary";
                            console.log(`✅ Daily content saved via Cloudinary raw: ${payload.url}`);
                        } catch (cldErr: any) {
                            console.error("Cloudinary raw fallback failed:", cldErr?.message);
                        }
                    }
                }
            }

            await db.collection(CONTENT_COLLECTION).doc(contentId).set(payload);

            return res.status(200).json({
                success: true,
                message: "Daily content added successfully",
                data: {
                    id: contentId,
                    title,
                    date,
                    url: payload.url || null,
                    targetAudience: payload.targetAudience,
                    targetBatch: payload.targetBatch
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while saving daily content"
            });
        }
    }

    /**
     * GET DAILY CONTENT (Students/Admins)
     * GET /api/lms/daily-content
     */
    static async getDailyContent(req: Request, res: Response) {
        try {
            const { date, batch, isPaid } = req.query;
            let finalBatch = batch;
            let finalIsPaid = isPaid;

            if (req.user && req.user.role === "student") {
                const userDoc = await db.collection("users").doc(req.user.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData?.studentId) {
                        const studentDoc = await db.collection("students").doc(userData.studentId).get();
                        if (studentDoc.exists) {
                            const studentData = studentDoc.data();
                            if (!finalBatch && studentData?.batch) {
                                finalBatch = studentData.batch;
                            }
                            if (finalIsPaid === undefined) {
                                finalIsPaid = studentData?.isPaid ? "true" : "false";
                            }
                        }
                    }
                }
            }

            let query: admin.firestore.Query = db.collection(CONTENT_COLLECTION)
                .where("isDeleted", "==", false);

            if (date) {
                query = query.where("date", "==", date as string);
            }

            const snapshot = await query.get();
             let contentList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    type: data.type,
                    source: data.source,
                    url: data.url || null,
                    fileBase64: data.fileBase64 || null,
                    fileName: data.fileName || null,
                    date: data.date,
                    targetAudience: data.targetAudience || "all",
                    targetBatch: data.targetBatch || null,
                    description: data.description || null,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    createdBy: data.createdBy,
                    status: data.status || "approved"
                };
            });

            // Filter out pending content unless includePending is true
            const includePending = req.query.includePending === "true";
            if (!includePending) {
                contentList = contentList.filter(c => c.status !== "pending");
            }

            // If batch/isPaid query params or resolved student attributes are supplied, filter accordingly
            if (finalBatch || finalIsPaid !== undefined) {
                const isPaidBool = String(finalIsPaid) === "true";
                const batchStr = typeof finalBatch === "string" ? finalBatch.trim().toLowerCase() : "";
                contentList = contentList.filter(c => {
                    const aud = c.targetAudience || "all";
                    if (aud === "all") return true;
                    if (aud === "paid") return isPaidBool;
                    if (aud === "batch") {
                        if (!c.targetBatch) return true;
                        const targetBatches = c.targetBatch.split(",").map((b: string) => b.trim().toLowerCase());
                        return batchStr && targetBatches.includes(batchStr);
                    }
                    return true;
                });
            }

            // Sort client-side by date desc, then createdAt desc to avoid requiring complex Firestore composite indexes
            contentList.sort((a, b) => {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            });

            return res.status(200).json({
                success: true,
                data: contentList
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching daily content"
            });
        }
    }

    /**
     * DELETE DAILY CONTENT (Admin/Staff)
     * DELETE /api/lms/daily-content/:id
     */
    static async deleteDailyContent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID is required for deletion"
                });
            }

            // Fetch the document first to get the Drive file ID if it exists
            const docRef = db.collection(CONTENT_COLLECTION).doc(id);
            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                const driveFileId = data?.googleDriveFileId;
                if (driveFileId) {
                    // Delete from Google Drive silently (don't block deletion if Drive fails)
                    deleteFileFromGoogleDrive(driveFileId).catch(err =>
                        console.warn(`Drive delete skipped for ${driveFileId}:`, err?.message)
                    );
                }
                // Also clean up local disk file if applicable
                if (data?.source === "local" && data?.url) {
                    try {
                        const fs = require("fs");
                        const path = require("path");
                        const localPath = path.resolve(process.cwd(), "public", data.url);
                        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                    } catch (fsErr: any) {
                        console.warn("Local file cleanup failed:", fsErr?.message);
                    }
                }
            }

            await docRef.delete();

            return res.status(200).json({
                success: true,
                message: "Daily content deleted successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting daily content"
            });
        }
    }
}
