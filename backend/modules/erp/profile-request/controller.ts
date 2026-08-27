import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { uploadFileToGoogleDrive, deleteFileFromGoogleDrive } from "../../../services/google_drive";
import { uploadStudentImage, deleteStudentImage } from "../../../shared/utils/cloudinary"; // kept as fallback

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const COLLECTION = "profile_requests";

export class ProfileRequestController {
    /**
     * STUDENT SUBMITS PROFILE COMPLETION REQUEST
     * POST /api/erp/profile-request
     */
    static async submit(req: Request, res: Response) {
        try {
            const {
                studentId,
                username,
                name,
                dob,
                bloodGroup,
                address,
                gender,
                community,
                fatherName,
                occupation,
                altPhone,
                email,
                qualification,
                college,
                referralSource,
                passportPhotoBase64,
                photoIdBase64,
                photoIdType,
                studentOccupation,
                initial,
                horizontalReservation,
                constituency
            } = req.body;

            if (!studentId || !username) {
                return res.status(400).json({ success: false, message: "studentId and username are required" });
            }

            // Check submission limit (max 3)
            const studentSnap = await db.collection("students")
                .where("id", "==", studentId)
                .limit(1)
                .get();

            if (studentSnap.empty) {
                return res.status(404).json({ success: false, message: "Student record not found" });
            }

            const studentDoc = studentSnap.docs[0];
            const studentData = studentDoc.data();
            const submitCount = studentData.profileSubmitCount || 0;
            let currentCount = 0;
            if (typeof submitCount === "number") {
                currentCount = submitCount;
            } else if (submitCount && typeof submitCount === "object" && typeof (submitCount as any).__increment === "number") {
                currentCount = (submitCount as any).__increment;
            }

            // Upsert: if a pending request exists for this student, overwrite it
            const existing = await db.collection(COLLECTION)
                .where("studentId", "==", studentId)
                .where("status", "==", "pending")
                .limit(1)
                .get();

            const id = existing.empty ? randomUUID() : existing.docs[0].id;

            const studentName = name || studentData.name || studentData.firstName || username || "Student";
            const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, "_");
            const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, "_");
            const folderName = `${safeName}_${safeId}`;

            // ── Upload passport photo to Google Drive (primary) ──
            let passportPhotoUrl = "";
            let passportPhotoPublicId = "";
            let passportPhotoDisplayUrl = "";
            if (passportPhotoBase64 && (passportPhotoBase64.startsWith("http://") || passportPhotoBase64.startsWith("https://"))) {
                passportPhotoUrl = passportPhotoBase64;
                passportPhotoDisplayUrl = passportPhotoBase64;
            } else if (passportPhotoBase64 && passportPhotoBase64 !== "test") {
                try {
                    // Decode the data URL
                    const passportRaw = passportPhotoBase64.startsWith("data:")
                        ? passportPhotoBase64
                        : `data:image/jpeg;base64,${passportPhotoBase64}`;
                    const commaIdx = passportRaw.indexOf(",");
                    const mimeMatch = passportRaw.substring(0, commaIdx).match(/data:(.*?);base64/);
                    const mime = mimeMatch?.[1] || "image/jpeg";
                    const ext = mime.includes("png") ? "png" : "jpg";
                    const pureBase64 = passportRaw.substring(commaIdx + 1);
                    const fileBuffer = Buffer.from(pureBase64, "base64");

                    console.log("[Drive] Uploading passport photo for student:", studentId);
                    const driveResult = await uploadFileToGoogleDrive({
                        fileName: `passport_photo_${safeId}.${ext}`,
                        mimeType: mime,
                        buffer: fileBuffer,
                        subPath: `ERP/Students/${folderName}`
                    });

                    if (driveResult) {
                        passportPhotoUrl = driveResult.previewUrl;
                        passportPhotoPublicId = driveResult.fileId;
                        passportPhotoDisplayUrl = driveResult.previewUrl;
                        console.log("[Drive] Passport photo uploaded:", driveResult.fileId);
                    } else {
                        throw new Error("Drive returned null");
                    }
                } catch (uploadErr: any) {
                    // Fallback to Cloudinary
                    try {
                        console.warn("[Drive] Passport photo failed, falling back to Cloudinary:", uploadErr.message);
                        const result = await uploadStudentImage(passportPhotoBase64, "passport_photo", studentId);
                        passportPhotoUrl = result.url;
                        passportPhotoPublicId = result.publicId;
                        passportPhotoDisplayUrl = result.displayUrl;
                    } catch (cldErr: any) {
                        console.error("[Cloudinary] Passport photo fallback also failed:", cldErr.message);
                    }
                }
            }

            // ── Upload photo ID to Google Drive (primary) ──
            let photoIdUrl = "";
            let photoIdPublicId = "";
            let photoIdDisplayUrl = "";
            if (photoIdBase64 && (photoIdBase64.startsWith("http://") || photoIdBase64.startsWith("https://"))) {
                photoIdUrl = photoIdBase64;
                photoIdDisplayUrl = photoIdBase64;
            } else if (photoIdBase64 && photoIdBase64 !== "test") {
                try {
                    const idRaw = photoIdBase64.startsWith("data:")
                        ? photoIdBase64
                        : `data:image/jpeg;base64,${photoIdBase64}`;
                    const commaIdx = idRaw.indexOf(",");
                    const mimeMatch = idRaw.substring(0, commaIdx).match(/data:(.*?);base64/);
                    const mime = mimeMatch?.[1] || "image/jpeg";
                    const ext = mime.includes("png") ? "png" : "jpg";
                    const pureBase64 = idRaw.substring(commaIdx + 1);
                    const fileBuffer = Buffer.from(pureBase64, "base64");
                    const safeType = (photoIdType || "id").replace(/[^a-zA-Z0-9_-]/g, "_");

                    console.log("[Drive] Uploading photo ID for student:", studentId);
                    const driveResult = await uploadFileToGoogleDrive({
                        fileName: `photo_id_${safeType}_${safeId}.${ext}`,
                        mimeType: mime,
                        buffer: fileBuffer,
                        subPath: `ERP/Students/${folderName}`
                    });

                    if (driveResult) {
                        photoIdUrl = driveResult.previewUrl;
                        photoIdPublicId = driveResult.fileId;
                        photoIdDisplayUrl = driveResult.previewUrl;
                        console.log("[Drive] Photo ID uploaded:", driveResult.fileId);
                    } else {
                        throw new Error("Drive returned null");
                    }
                } catch (uploadErr: any) {
                    // Fallback to Cloudinary
                    try {
                        console.warn("[Drive] Photo ID failed, falling back to Cloudinary:", uploadErr.message);
                        const result = await uploadStudentImage(photoIdBase64, "photo_id", studentId);
                        photoIdUrl = result.url;
                        photoIdPublicId = result.publicId;
                        photoIdDisplayUrl = result.displayUrl;
                    } catch (cldErr: any) {
                        console.error("[Cloudinary] Photo ID fallback also failed:", cldErr.message);
                    }
                }
            }

            const payload: any = {
                id,
                studentId,
                username,
                name: name || "",
                dob: dob || "",
                bloodGroup: bloodGroup || "",
                address: address || "",
                gender: gender || "",
                community: community || "",
                fatherName: fatherName || "",
                occupation: occupation || "",
                altPhone: altPhone || "",
                email: email || "",
                qualification: qualification || "",
                college: college || "",
                referralSource: referralSource || "",
                // Store Cloudinary URLs (preferred) + keep base64 as fallback for legacy display
                passportPhotoBase64: passportPhotoDisplayUrl || passportPhotoBase64 || "",
                passportPhotoUrl: passportPhotoUrl || "",
                passportPhotoPublicId: passportPhotoPublicId || "",
                passportPhotoDisplayUrl: passportPhotoDisplayUrl || "",
                photoIdBase64: photoIdDisplayUrl || photoIdBase64 || "",
                photoIdUrl: photoIdUrl || "",
                photoIdPublicId: photoIdPublicId || "",
                photoIdDisplayUrl: photoIdDisplayUrl || "",
                photoIdType: photoIdType || "",
                status: "pending",
                submittedAt: admin.firestore.FieldValue.serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
                rejectionReason: null,
                studentOccupation: studentOccupation || "",
                initial: initial || "",
                horizontalReservation: horizontalReservation || "",
                constituency: constituency || ""
            };

            await db.collection(COLLECTION).doc(id).set(payload, { merge: true });

            const newCount = currentCount + 1;

            await db.collection("students").doc(studentDoc.id).update({
                profileSubmitCount: newCount,
                isProfileSubmitted: true,
                profileEditPermission: false
            });

            return res.status(201).json({
                success: true,
                message: "Profile completion request submitted. Awaiting admin approval.",
                data: { id }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to submit profile request" });
        }
    }

    /**
     * ADMIN GETS ALL PENDING REQUESTS
     * GET /api/erp/profile-request
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { status } = req.query;
            let query: any = db.collection(COLLECTION);
            if (status) {
                query = query.where("status", "==", status);
            }

            const snapshot = await query.get();
            const requests = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return {
                    ...data,
                    submittedAt: data.submittedAt ? (data.submittedAt as any).toDate?.()?.toISOString() : null,
                    reviewedAt: data.reviewedAt ? (data.reviewedAt as any).toDate?.()?.toISOString() : null
                };
            });

            // Sort in-memory: newest first
            requests.sort((a: any, b: any) => {
                const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return timeB - timeA;
            });

            return res.status(200).json({ success: true, data: requests });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to fetch profile requests" });
        }
    }

    /**
     * GET REQUEST FOR A SPECIFIC STUDENT
     * GET /api/erp/profile-request/student/:studentId
     */
    static async getByStudent(req: Request, res: Response) {
        try {
            const { studentId } = req.params;

            const snapshot = await db.collection(COLLECTION)
                .where("studentId", "==", studentId)
                .get();

            if (snapshot.empty) {
                return res.status(200).json({ success: true, data: null });
            }

            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    submittedAt: data.submittedAt ? (data.submittedAt as any).toDate?.()?.toISOString() : null,
                    reviewedAt: data.reviewedAt ? (data.reviewedAt as any).toDate?.()?.toISOString() : null
                };
            });

            // Sort in-memory desc
            docs.sort((a: any, b: any) => {
                const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return timeB - timeA;
            });

            return res.status(200).json({
                success: true,
                data: docs[0]
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to fetch profile request" });
        }
    }

    /**
     * ADMIN APPROVES A PROFILE REQUEST
     * PUT /api/erp/profile-request/:id/approve
     */
    static async approve(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reviewedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Request not found" });
            }

            const data = doc.data()!;

            // Update profile_request status
            await docRef.update({
                status: "approved",
                reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
                reviewedBy: reviewedBy || "admin"
            });

            // Apply profile data to the student record
            const updateFields: any = {
                profileComplete: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                approvedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            if (data.name) {
                updateFields.fullName = data.name;
                const parts = data.name.trim().split(/\s+/);
                updateFields.firstName = parts[0] || "";
                updateFields.lastName = parts.slice(1).join(" ") || "";
            }
            if (data.dob) {
                updateFields.dateOfBirth = data.dob;
                updateFields.dob = data.dob;
            }
            if (data.bloodGroup) updateFields.bloodGroup = data.bloodGroup;
            if (data.address) updateFields.address = data.address;
            if (data.gender) updateFields.gender = data.gender;
            if (data.community) updateFields.community = data.community;
            if (data.fatherName) updateFields.fatherName = data.fatherName;
            if (data.occupation) updateFields.occupation = data.occupation;
            if (data.altPhone) updateFields.altPhone = data.altPhone;
            if (data.email) updateFields.email = data.email;
            if (data.qualification) updateFields.qualification = data.qualification;
            if (data.college) updateFields.college = data.college;
            if (data.referralSource) updateFields.referralSource = data.referralSource;
            if (data.studentOccupation) updateFields.studentOccupation = data.studentOccupation;
            if (data.initial) updateFields.initial = data.initial;
            if (data.horizontalReservation) updateFields.horizontalReservation = data.horizontalReservation;
            if (data.constituency) updateFields.constituency = data.constituency;
            // Prefer Cloudinary display URLs; fall back to base64 for legacy records
            if (data.passportPhotoDisplayUrl || data.passportPhotoBase64) {
                updateFields.photoBase64 = data.passportPhotoDisplayUrl || data.passportPhotoBase64;
                updateFields.photoUrl = data.passportPhotoUrl || data.passportPhotoDisplayUrl || "";
                updateFields.photoPublicId = data.passportPhotoPublicId || "";
            }
            if (data.photoIdDisplayUrl || data.photoIdBase64) {
                updateFields.photoIdBase64 = data.photoIdDisplayUrl || data.photoIdBase64;
                updateFields.photoIdUrl = data.photoIdUrl || data.photoIdDisplayUrl || "";
                updateFields.photoIdPublicId = data.photoIdPublicId || "";
            }
            if (data.photoIdType) updateFields.photoIdType = data.photoIdType;

            const studentRef = db.collection("students").doc(data.studentId);
            const studentDoc = await studentRef.get();

            if (studentDoc.exists) {
                await studentRef.update(updateFields);
            } else {
                const studentSnap = await db.collection("students")
                    .where("id", "==", data.studentId)
                    .limit(1)
                    .get();
                if (!studentSnap.empty) {
                    await db.collection("students").doc(studentSnap.docs[0].id).update(updateFields);
                } else {
                    const userStudentSnap = await db.collection("students")
                        .where("loginUsername", "==", data.username)
                        .limit(1)
                        .get();
                    if (!userStudentSnap.empty) {
                        await db.collection("students").doc(userStudentSnap.docs[0].id).update(updateFields);
                    }
                }
            }

            // Also update the user display name
            const userSnap = await db.collection("users")
                .where("username", "==", data.username)
                .limit(1)
                .get();
            if (!userSnap.empty && data.name) {
                await db.collection("users").doc(userSnap.docs[0].id).update({ name: data.name });
            }

            return res.status(200).json({ success: true, message: "Profile request approved and student record updated." });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to approve profile request" });
        }
    }

    /**
     * ADMIN REJECTS A PROFILE REQUEST
     * PUT /api/erp/profile-request/:id/reject
     */
    static async reject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { reviewedBy, rejectionReason } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Request not found" });
            }

            const data = doc.data()!;

            await docRef.update({
                status: "rejected",
                reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
                reviewedBy: reviewedBy || "admin",
                rejectionReason: rejectionReason || "Please resubmit with correct details."
            });

            // Grant edit permission back to student upon rejection so they can resubmit
            const studentRef = db.collection("students").doc(data.studentId);
            const studentDoc = await studentRef.get();
            if (studentDoc.exists) {
                await studentRef.update({ profileEditPermission: true, isProfileSubmitted: false });
            } else {
                const studentSnap = await db.collection("students")
                    .where("id", "==", data.studentId)
                    .limit(1)
                    .get();
                if (!studentSnap.empty) {
                    await db.collection("students").doc(studentSnap.docs[0].id).update({ profileEditPermission: true, isProfileSubmitted: false });
                }
            }

            return res.status(200).json({ success: true, message: "Profile request rejected." });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to reject profile request" });
        }
    }
}
