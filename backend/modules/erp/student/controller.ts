import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const COLLECTION = "students";

// ─── Security: strip sensitive fields before sending to client ───────────────
function sanitizeStudent(student: any): any {
    const s = { ...student };
    // Keep loginPassword to allow admin visibility of student passwords
    // delete s.loginPassword;
    delete s.password;
    delete s.passwordHash;
    return s;
}


export class StudentController {
    /**
     * CREATE STUDENT
     * POST /api/erp/student
     */
    static async create(req: Request, res: Response) {
        try {
            const {
                admissionNumber,
                rollNumber,
                firstName,
                lastName,
                dateOfBirth,
                dob,
                gender,
                bloodGroup,
                community,
                fatherName,
                occupation,
                altPhone,
                qualification,
                college,
                referralSource,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                batch,
                course,
                academicYear,
                status,
                photoUrl,
                motherName,
                guardianName,
                fatherPhone,
                motherPhone,
                guardianPhone,
                emergencyContact,
                previousSchool,
                previousClass,
                previousMarks,
                loginUsername,
                loginPassword,
                type,
                totalFees,
                feesPaid,
                joiningDate,
                attendedDays,
                totalDays,
                courseDuration,
                modeOfPayment,
                transactionId,
                batches,
                batchModes
            } = req.body;

            if (!loginUsername || !loginPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Username (roll number) and password are required"
                });
            }

            if (Number(feesPaid || 0) > Number(totalFees || 0)) {
                return res.status(400).json({
                    success: false,
                    message: "Fees Paid cannot exceed the Total Course Fees"
                });
            }

            if (loginUsername) {
                const existingSnapshot = await db.collection("users")
                    .where("username", "==", loginUsername)
                    .where("isDeleted", "==", false)
                    .limit(1)
                    .get();

                if (!existingSnapshot.empty) {
                    return res.status(400).json({
                        success: false,
                        message: "A user with this username already exists"
                    });
                }
            }

            const currentUserId = (req as any).user?.userId || "system";
            const tenantId = (req as any).user?.tenantId || "default_tenant";
            const id = randomUUID();
            const passwordHash = await bcrypt.hash(loginPassword, 12);

            const finalBatches = Array.isArray(batches) ? batches : (batch ? [batch] : []);
            const finalBatchModes = (batchModes && typeof batchModes === "object") ? batchModes : {};
            finalBatches.forEach((bName: string) => {
                if (!finalBatchModes[bName]) {
                    finalBatchModes[bName] = [type || "offline"];
                }
            });

            const payload: any = {
                id,
                tenantId,
                admissionNumber: admissionNumber || "",
                rollNumber: rollNumber || "",
                firstName: firstName || "",
                lastName: lastName || "",
                name: (firstName && lastName) ? `${firstName} ${lastName}` : (loginUsername || rollNumber || "Student"),
                displayName: (firstName && lastName) ? `${firstName} ${lastName}` : (loginUsername || rollNumber || "Student"),
                dateOfBirth: dateOfBirth || dob || "",
                dob: dob || dateOfBirth || "",
                gender: gender || "",
                bloodGroup: bloodGroup || "",
                community: community || "",
                fatherName: fatherName || "",
                occupation: occupation || "",
                altPhone: altPhone || "",
                qualification: qualification || "",
                college: college || "",
                referralSource: referralSource || "",
                email: email || "",
                phone: phone || "",
                address: address || "",
                city: city || "",
                state: state || "",
                pincode: pincode || "",
                batches: finalBatches,
                batchModes: finalBatchModes,
                batch: finalBatches[0] || "",
                course: course || "",
                academicYear: academicYear || "",
                type: (finalBatches[0] && finalBatchModes[finalBatches[0]] && finalBatchModes[finalBatches[0]][0]) || type || "offline",
                totalFees: totalFees !== undefined ? Number(totalFees) : 0,
                feesPaid: feesPaid !== undefined ? Number(feesPaid) : 0,
                joiningDate: joiningDate || "",
                attendedDays: attendedDays !== undefined ? Number(attendedDays) : 24,
                totalDays: totalDays !== undefined ? Number(totalDays) : 28,
                status: status || "active",
                profileComplete: false,
                profileEditPermission: true,
                photoUrl: photoUrl || "",
                photoBase64: "",
                photoIdBase64: "",
                photoIdType: "",
                motherName: motherName || "",
                guardianName: guardianName || "",
                fatherPhone: fatherPhone || "",
                motherPhone: motherPhone || "",
                guardianPhone: guardianPhone || "",
                emergencyContact: emergencyContact || "",
                previousSchool: previousSchool || "",
                previousClass: previousClass || "",
                previousMarks: previousMarks || 0,
                loginUsername: loginUsername || "",
                passwordHash,
                courseDuration: courseDuration || "",
                modeOfPayment: modeOfPayment || "cash",
                transactionId: transactionId || "",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUserId,
                updatedBy: currentUserId,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                feeInstallments: [] as any[] // populated below if feesPaid > 0
            };

            // Build initial fee installments if fee was collected at admission
            const initialInstallments: any[] = [];
            if (Number(feesPaid || 0) > 0) {
                initialInstallments.push({
                    installmentNo: 1,
                    amount: Number(feesPaid),
                    date: new Date().toISOString(),
                    modeOfPayment: modeOfPayment || "cash",
                    transactionId: transactionId || "",
                    recordedBy: currentUserId,
                    note: "Initial payment at admission"
                });
            }
            // Assign the built installments back to the payload before saving
            payload.feeInstallments = initialInstallments;

            await db.collection(COLLECTION).doc(id).set(payload);

            if (loginUsername) {
                const userId = randomUUID();
                const userPayload = {
                    id: userId,
                    tenantId,
                    username: loginUsername,
                    passwordHash,
                    name: (firstName && lastName) ? `${firstName} ${lastName}` : loginUsername,
                    email: email || "",
                    role: "student",
                    studentId: id,
                    profileComplete: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUserId,
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                };
                await db.collection("users").doc(userId).set(userPayload);
            }

            return res.status(201).json({
                success: true,
                message: "Student created successfully",
                data: sanitizeStudent({
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while creating the student"
            });
        }
    }

    /**
     * GET ALL STUDENTS (WITH SEARCH, FILTER, PAGINATION, SORTING)
     * GET /api/erp/student
     */
    static async getAll(req: Request, res: Response) {
        try {
            const {
                search,
                batch,
                course,
                academicYear,
                status,
                limit = 20,
                startAfter,
                sortBy = "createdAt",
                sortOrder = "desc"
            } = req.query;

            const parseTimestamp = (val: any) => {
                if (!val) return null;
                if (typeof val.toDate === "function") return val.toDate().toISOString();
                return new Date(val).toISOString();
            };

            const snapshot = await db.collection(COLLECTION).get();

            // Fetch all users to resolve createdBy admin IDs to names
            const usersMap: Record<string, string> = {};
            try {
                const usersSnap = await db.collection("users")
                    .where("role", "in", ["admin", "super_admin", "staff", "teacher", "editor", "contributor", "developer"])
                    .get();
                usersSnap.docs.forEach(doc => {
                    const u = doc.data();
                    const name = u.name || u.username || doc.id;
                    usersMap[doc.id] = name;
                    if (u.id) usersMap[u.id] = name;
                });
            } catch (err) {
                console.error("Failed to build usersMap for createdBy resolution:", err);
            }

            let students = snapshot.docs.map(doc => {
                const data = doc.data();
                const creatorId = data.createdBy || "";
                const creatorName = usersMap[creatorId] || creatorId || "Super Admin";
                return {
                    ...data,
                    createdBy: creatorName,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt),
                    deletedAt: parseTimestamp(data.deletedAt),
                    approvedAt: parseTimestamp(data.approvedAt)
                };
            });

            // 1. Filter in-memory
            students = students.filter((student: any) => {
                if (student.isDeleted === true) return false;
                if (batch && student.batch !== batch) return false;
                if (course && student.course !== course) return false;
                if (academicYear && student.academicYear !== academicYear) return false;
                if (status && student.status !== status) return false;
                return true;
            });

            // 2. Search filter in-memory
            if (search) {
                const searchLower = (search as string).toLowerCase();
                students = students.filter((student: any) =>
                    student.firstName?.toLowerCase().includes(searchLower) ||
                    student.lastName?.toLowerCase().includes(searchLower) ||
                    student.admissionNumber?.toLowerCase().includes(searchLower) ||
                    student.rollNumber?.toLowerCase().includes(searchLower) ||
                    student.email?.toLowerCase().includes(searchLower) ||
                    student.phone?.includes(searchLower)
                );
            }

            // 3. Sort in-memory
            const sortField = sortBy as string;
            const orderDirection = sortOrder === "asc" ? 1 : -1;
            students.sort((a: any, b: any) => {
                const valA = a[sortField];
                const valB = b[sortField];
                
                if (valA === undefined || valA === null) return 1;
                if (valB === undefined || valB === null) return -1;
                
                if (typeof valA === "string") {
                    return valA.localeCompare(valB) * orderDirection;
                }
                return (valA > valB ? 1 : -1) * orderDirection;
            });

            // 4. Pagination in-memory
            let startIndex = 0;
            if (startAfter) {
                const foundIndex = students.findIndex((student: any) => student.id === startAfter);
                if (foundIndex !== -1) {
                    startIndex = foundIndex + 1;
                }
            }

            const limitNum = parseInt(limit as string, 10);
            const paginatedStudents = students.slice(startIndex, startIndex + limitNum);
            const hasMore = startIndex + limitNum < students.length;
            const nextPageToken = paginatedStudents.length > 0 && hasMore ? (paginatedStudents[paginatedStudents.length - 1] as any).id : null;

            return res.status(200).json({
                success: true,
                data: paginatedStudents.map(sanitizeStudent),
                pagination: {
                    limit: limitNum,
                    nextPageToken,
                    hasMore
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving students"
            });
        }
    }

    /**
     * GET SINGLE STUDENT
     * GET /api/erp/student/:id
     */
    static async getOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const doc = await db.collection(COLLECTION).doc(id).get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            const data = doc.data()!;
            let creatorName = data.createdBy || "";
            if (creatorName && creatorName.length > 20) {
                try {
                    const userDoc = await db.collection("users").doc(creatorName).get();
                    if (userDoc.exists) {
                        creatorName = userDoc.data()?.name || userDoc.data()?.username || creatorName;
                    }
                } catch (_) {}
            }

            return res.status(200).json({
                success: true,
                data: sanitizeStudent({
                    ...data,
                    createdBy: creatorName || "Super Admin",
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    approvedAt: data.approvedAt ? (data.approvedAt as admin.firestore.Timestamp).toDate().toISOString() : null
                })
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving the student"
            });
        }
    }

    /**
     * UPDATE STUDENT
     * PUT /api/erp/student/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const {
                admissionNumber,
                rollNumber,
                firstName,
                lastName,
                dateOfBirth,
                dob,
                gender,
                bloodGroup,
                community,
                fatherName,
                occupation,
                altPhone,
                qualification,
                college,
                referralSource,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                batch,
                course,
                academicYear,
                status,
                photoUrl,
                motherName,
                guardianName,
                fatherPhone,
                motherPhone,
                guardianPhone,
                emergencyContact,
                previousSchool,
                previousClass,
                previousMarks,
                updatedBy,
                type,
                totalFees,
                feesPaid,
                joiningDate,
                loginUsername,
                loginPassword,
                idCardGenerated,
                idCardTheme,
                idCardRole,
                idCardExpiry,
                hallTicketGenerated,
                hallTicketExamName,
                hallTicketExamDate,
                hallTicketVenue,
                hallTicketTime,
                hallTicketInstructions,
                attendedDays,
                totalDays,
                profileEditPermission,
                isProfileSubmitted,
                profileSubmitCount,
                modeOfPayment,
                transactionId,
                batches,
                batchModes
            } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            const currentTotal = totalFees !== undefined ? Number(totalFees) : (doc.data()?.totalFees || 0);
            const currentPaid = feesPaid !== undefined ? Number(feesPaid) : (doc.data()?.feesPaid || 0);

            if (currentPaid > currentTotal) {
                return res.status(400).json({
                    success: false,
                    message: "Fees Paid cannot exceed the Total Course Fees"
                });
            }

            const updateData: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: updatedBy || "admin"
            };

            if (admissionNumber !== undefined) updateData.admissionNumber = admissionNumber;
            if (rollNumber !== undefined) updateData.rollNumber = rollNumber;
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (dateOfBirth !== undefined) {
                updateData.dateOfBirth = dateOfBirth;
                updateData.dob = dateOfBirth;
            }
            if (dob !== undefined && dateOfBirth === undefined) {
                updateData.dateOfBirth = dob;
                updateData.dob = dob;
            }
            if (gender !== undefined) updateData.gender = gender;
            if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
            if (community !== undefined) updateData.community = community;
            if (fatherName !== undefined) updateData.fatherName = fatherName;
            if (occupation !== undefined) updateData.occupation = occupation;
            if (altPhone !== undefined) updateData.altPhone = altPhone;
            if (qualification !== undefined) updateData.qualification = qualification;
            if (college !== undefined) updateData.college = college;
            if (referralSource !== undefined) updateData.referralSource = referralSource;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (phone !== undefined) updateData.phone = phone;
            if (address !== undefined) updateData.address = address;
            if (city !== undefined) updateData.city = city;
            if (state !== undefined) updateData.state = state;
            if (pincode !== undefined) updateData.pincode = pincode;
            if (batches !== undefined) {
                updateData.batches = Array.isArray(batches) ? batches : [];
                updateData.batch = updateData.batches[0] || "";
            }
            if (batchModes !== undefined) {
                updateData.batchModes = (batchModes && typeof batchModes === "object") ? batchModes : {};
                const firstBatch = updateData.batch || doc.data()?.batch;
                if (firstBatch && updateData.batchModes[firstBatch]) {
                    updateData.type = updateData.batchModes[firstBatch][0] || "offline";
                }
            }
            if (batch !== undefined && batches === undefined) {
                updateData.batch = batch;
                updateData.batches = [batch].filter(Boolean);
            }
            if (course !== undefined) updateData.course = course;
            if (academicYear !== undefined) updateData.academicYear = academicYear;
            if (status !== undefined) updateData.status = status;
            if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
            if (fatherName !== undefined) updateData.fatherName = fatherName;
            if (motherName !== undefined) updateData.motherName = motherName;
            if (guardianName !== undefined) updateData.guardianName = guardianName;
            if (fatherPhone !== undefined) updateData.fatherPhone = fatherPhone;
            if (motherPhone !== undefined) updateData.motherPhone = motherPhone;
            if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;
            if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
            if (previousSchool !== undefined) updateData.previousSchool = previousSchool;
            if (previousClass !== undefined) updateData.previousClass = previousClass;
            if (previousMarks !== undefined) updateData.previousMarks = previousMarks;
            if (type !== undefined && batchModes === undefined) {
                updateData.type = type;
                const activeBatch = updateData.batch || doc.data()?.batch;
                if (activeBatch) {
                    updateData[`batchModes.${activeBatch}`] = [type];
                }
            }
            if (totalFees !== undefined) updateData.totalFees = Number(totalFees);
            if (feesPaid !== undefined) updateData.feesPaid = Number(feesPaid);

            // Append a new installment entry if feesPaid increased
            if (feesPaid !== undefined) {
                const previousPaid = Number(doc.data()?.feesPaid || 0);
                const newPaidAmount = Number(feesPaid);
                const incrementalAmount = newPaidAmount - previousPaid;
                if (incrementalAmount > 0) {
                    const existingInstallments: any[] = Array.isArray(doc.data()?.feeInstallments)
                        ? doc.data()!.feeInstallments
                        : [];
                    const newInstallment = {
                        installmentNo: existingInstallments.length + 1,
                        amount: incrementalAmount,
                        date: new Date().toISOString(),
                        modeOfPayment: modeOfPayment || "cash",
                        transactionId: transactionId || "",
                        recordedBy: updatedBy || "admin",
                        note: ""
                    };
                    // Append new installment using arrayUnion for atomic safety
                    updateData.feeInstallments = admin.firestore.FieldValue.arrayUnion(newInstallment);
                }
            }
            if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
            if (attendedDays !== undefined) updateData.attendedDays = Number(attendedDays);
            if (totalDays !== undefined) updateData.totalDays = Number(totalDays);
            if (loginUsername !== undefined) updateData.loginUsername = loginUsername;
            if (loginPassword !== undefined && loginPassword) {
                const newHash = await bcrypt.hash(loginPassword, 12);
                updateData.passwordHash = newHash;
                updateData.loginPassword = loginPassword; // Keep plaintext password for admin visibility

                // Also sync password hash to users collection
                try {
                    const uSnap = await db.collection("users").where("studentId", "==", id).limit(1).get();
                    if (!uSnap.empty) {
                        await uSnap.docs[0].ref.update({
                            passwordHash: newHash,
                            password: loginPassword, // Keep plaintext password for admin visibility
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedBy: (req as any).user?.userId || "system"
                        });
                    }
                } catch (uErr) {
                    console.error("Failed to sync user passwordHash:", uErr);
                }
            }
            if (profileEditPermission !== undefined) updateData.profileEditPermission = profileEditPermission;
            if (isProfileSubmitted !== undefined) updateData.isProfileSubmitted = isProfileSubmitted;
            if (profileSubmitCount !== undefined) updateData.profileSubmitCount = profileSubmitCount;
            if (idCardGenerated !== undefined) updateData.idCardGenerated = idCardGenerated;
            if (idCardTheme !== undefined) updateData.idCardTheme = idCardTheme;
            if (idCardRole !== undefined) updateData.idCardRole = idCardRole;
            if (idCardExpiry !== undefined) updateData.idCardExpiry = idCardExpiry;
            if (hallTicketGenerated !== undefined) updateData.hallTicketGenerated = hallTicketGenerated;
            if (hallTicketExamName !== undefined) updateData.hallTicketExamName = hallTicketExamName;
            if (hallTicketExamDate !== undefined) updateData.hallTicketExamDate = hallTicketExamDate;
            if (hallTicketVenue !== undefined) updateData.hallTicketVenue = hallTicketVenue;
            if (hallTicketTime !== undefined) updateData.hallTicketTime = hallTicketTime;
            if (hallTicketInstructions !== undefined) updateData.hallTicketInstructions = hallTicketInstructions;

            await docRef.update(updateData);

            // If fee details are updated, delete existing fee alerts for this student
            if (totalFees !== undefined || feesPaid !== undefined) {
                try {
                    const studentName = `${doc.data()?.firstName || ""} ${doc.data()?.lastName || ""}`.trim();
                    const alertsSnapshot = await db.collection("announcements")
                        .where("isDeleted", "==", false)
                        .get();
                    
                    const batchWrite = db.batch();
                    let hasUpdates = false;

                    alertsSnapshot.docs.forEach(alertDoc => {
                        const data = alertDoc.data();
                        const title = (data.title || "").toLowerCase();
                        const content = (data.content || "").toLowerCase();
                        const lowerName = studentName.toLowerCase();
                        const targetStudentId = data.targetStudentId;

                        const isFeeAlert = title.includes("fee payment alert") || 
                                           content.includes("pay your pending") || 
                                           content.includes("pending tuition fee");

                        const matchesStudent = (targetStudentId && String(targetStudentId) === String(id)) ||
                                               (isFeeAlert && lowerName && (title.includes(lowerName) || content.includes(lowerName)));

                        if (isFeeAlert && matchesStudent) {
                            batchWrite.update(db.collection("announcements").doc(alertDoc.id), {
                                isDeleted: true,
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                                deletedBy: "system-fees-updated"
                            });
                            hasUpdates = true;
                        }
                    });

                    if (hasUpdates) {
                        await batchWrite.commit();
                    }
                } catch (err) {
                    console.error("Failed to delete fee alerts for student:", err);
                }
            }

            // Synchronize with users collection
            if (loginUsername !== undefined || loginPassword !== undefined) {
                const userSnapshot = await db.collection("users").where("studentId", "==", id).limit(1).get();
                if (!userSnapshot.empty) {
                    const userDocRef = db.collection("users").doc(userSnapshot.docs[0].id);
                    const userUpdate: any = {
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    if (loginUsername !== undefined) userUpdate.username = loginUsername;
                    if (loginPassword !== undefined) {
                        userUpdate.password = loginPassword;
                        userUpdate.passwordHash = admin.firestore.FieldValue.delete();
                    }
                    await userDocRef.update(userUpdate);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Student updated successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while updating the student"
            });
        }
    }

    /**
    /**
     * HARD DELETE STUDENT
     * DELETE /api/erp/student/:id
     * Physically removes the student and all linked user accounts from Firestore.
     * Archives the full record to `deleted_students` for audit purposes.
     * A deleted student can NEVER log in again.
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found"
                });
            }

            const studentData = doc.data()!;

            // 1. Archive to deleted_students before deletion (for audit trail)
            const archiveRef = db.collection("deleted_students").doc(id);
            await archiveRef.set({
                ...studentData,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin",
                originalId: id
            });

            // 2. Hard-delete the student document from Firestore
            await docRef.delete();

            // 3. Find and hard-delete ALL linked user accounts (by studentId or loginUsername)
            const usersToDelete: admin.firestore.DocumentReference[] = [];

            // Find by studentId link
            const usersByStudentId = await db.collection("users")
                .where("studentId", "==", id)
                .get();
            usersByStudentId.docs.forEach(d => usersToDelete.push(d.ref));

            // Also find by username match (safety net for orphaned users)
            if (studentData.loginUsername) {
                const usersByUsername = await db.collection("users")
                    .where("username", "==", studentData.loginUsername)
                    .get();
                usersByUsername.docs.forEach(d => {
                    if (!usersToDelete.find(r => r.id === d.ref.id)) {
                        usersToDelete.push(d.ref);
                    }
                });
            }

            // Hard-delete each linked user account
            const deletePromises = usersToDelete.map(ref => ref.delete());
            await Promise.all(deletePromises);

            return res.status(200).json({
                success: true,
                message: "Student permanently deleted. Account cannot be recovered."
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting the student"
            });
        }
    }

    /**
     * BULK UPDATE CREDENTIALS
     * POST /api/erp/student/bulk/credentials
     */
    static async bulkUpdateCredentials(req: Request, res: Response) {
        try {
            const {
                batch,
                type,
                idCardGenerated,
                idCardTheme,
                idCardRole,
                idCardExpiry,
                hallTicketGenerated,
                hallTicketExamName,
                hallTicketExamDate,
                hallTicketVenue,
                hallTicketTime,
                hallTicketInstructions,
                targetGroup
            } = req.body;

            const updateData: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: "admin"
            };

            if (type === "idcard") {
                if (idCardGenerated !== undefined) updateData.idCardGenerated = idCardGenerated;
                if (idCardTheme !== undefined) updateData.idCardTheme = idCardTheme;
                if (idCardRole !== undefined) updateData.idCardRole = idCardRole;
                if (idCardExpiry !== undefined) updateData.idCardExpiry = idCardExpiry;
            } else if (type === "hallticket") {
                if (hallTicketGenerated !== undefined) updateData.hallTicketGenerated = hallTicketGenerated;
                if (hallTicketExamName !== undefined) updateData.hallTicketExamName = hallTicketExamName;
                if (hallTicketExamDate !== undefined) updateData.hallTicketExamDate = hallTicketExamDate;
                if (hallTicketVenue !== undefined) updateData.hallTicketVenue = hallTicketVenue;
                if (hallTicketTime !== undefined) updateData.hallTicketTime = hallTicketTime;
                if (hallTicketInstructions !== undefined) updateData.hallTicketInstructions = hallTicketInstructions;
            }

            let totalUpdated = 0;

            if (targetGroup) {
                // targetGroup can be 'free' (leads), 'paid' (students), 'all' (both)
                if (targetGroup === "free" || targetGroup === "all") {
                    const leadsSnapshot = await db.collection("leads")
                        .where("isDeleted", "==", false)
                        .get();
                    if (!leadsSnapshot.empty) {
                        const firestoreBatch = db.batch();
                        leadsSnapshot.docs.forEach(doc => {
                            firestoreBatch.update(doc.ref, updateData);
                        });
                        await firestoreBatch.commit();
                        totalUpdated += leadsSnapshot.size;
                    }
                }
                if (targetGroup === "paid" || targetGroup === "all") {
                    let query: admin.firestore.Query = db.collection("students")
                        .where("isDeleted", "==", false);
                    if (batch && batch !== "All Batches") {
                        query = query.where("batch", "==", batch);
                    }
                    const studentsSnapshot = await query.get();
                    if (!studentsSnapshot.empty) {
                        const firestoreBatch = db.batch();
                        studentsSnapshot.docs.forEach(doc => {
                            firestoreBatch.update(doc.ref, updateData);
                        });
                        await firestoreBatch.commit();
                        totalUpdated += studentsSnapshot.size;
                    }
                }
            } else {
                // Fallback to legacy batch-based student update
                let query: admin.firestore.Query = db.collection(COLLECTION)
                    .where("isDeleted", "==", false);

                if (batch && batch !== "All Batches") {
                    query = query.where("batch", "==", batch);
                }

                const snapshot = await query.get();
                if (!snapshot.empty) {
                    const firestoreBatch = db.batch();
                    snapshot.docs.forEach(doc => {
                        firestoreBatch.update(doc.ref, updateData);
                    });
                    await firestoreBatch.commit();
                    totalUpdated += snapshot.size;
                }
            }

            return res.status(200).json({
                success: true,
                message: `Successfully updated ${totalUpdated} profiles`,
                count: totalUpdated
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during bulk credentials update"
            });
        }
    }

    /**
     * GET CURRENT LOGGED-IN STUDENT PROFILE (self-service)
     * GET /api/erp/student/profile/me
     */
    static async getMe(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const { username, email, studentId, userId } = req.user as any;

            const parseTimestamp = (val: any) => {
                if (!val) return null;
                if (typeof val.toDate === "function") return val.toDate().toISOString();
                return new Date(val).toISOString();
            };

            const baseQuery = db.collection(COLLECTION).where("isDeleted", "==", false);
            let snapshot: admin.firestore.QuerySnapshot | null = null;

            // Try studentId first
            if (studentId) {
                const s = await baseQuery.where("id", "==", studentId).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            // Try userId
            if (!snapshot && userId) {
                const s = await baseQuery.where("id", "==", userId).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            // Try username (loginUsername or rollNumber)
            if (!snapshot && username) {
                const s = await baseQuery.where("loginUsername", "==", username).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            if (!snapshot && username) {
                const s = await baseQuery.where("rollNumber", "==", username).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            // Try email
            if (!snapshot && email) {
                const s = await baseQuery.where("email", "==", email).limit(1).get();
                if (!s.empty) snapshot = s;
            }

            if (!snapshot || snapshot.empty) {
                return res.status(404).json({ success: false, message: "Student profile not found" });
            }

            const doc = snapshot.docs[0];
            const data = doc.data();

            return res.status(200).json({
                success: true,
                data: [{
                    ...data,
                    id: data.id || doc.id,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt),
                    deletedAt: parseTimestamp(data.deletedAt),
                    approvedAt: parseTimestamp(data.approvedAt)
                }]
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching student profile"
            });
        }
    }

    /**
     * UPDATE CURRENT LOGGED-IN STUDENT PROFILE (self-service, restricted fields only)
     * PUT /api/erp/student/profile/me
     */
    static async updateMe(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            const { username, email, studentId, userId } = req.user as any;

            // Students may only update these fields via self-service
            const ALLOWED_FIELDS = ["loginPassword", "profileEditPermission", "isProfileSubmitted"];
            const updateData: any = {};
            for (const field of ALLOWED_FIELDS) {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ success: false, message: "No updatable fields provided" });
            }

            // If updating password, also hash and sync to users collection
            if (updateData.loginPassword) {
                const salt = await bcrypt.genSalt(10);
                updateData.passwordHash = await bcrypt.hash(updateData.loginPassword, salt);
                updateData.loginPasswordHash = updateData.passwordHash;
            }

            updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

            const baseQuery = db.collection(COLLECTION).where("isDeleted", "==", false);
            let snapshot: admin.firestore.QuerySnapshot | null = null;

            if (studentId) {
                const s = await baseQuery.where("id", "==", studentId).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            if (!snapshot && userId) {
                const s = await baseQuery.where("id", "==", userId).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            if (!snapshot && username) {
                const s = await baseQuery.where("loginUsername", "==", username).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            if (!snapshot && username) {
                const s = await baseQuery.where("rollNumber", "==", username).limit(1).get();
                if (!s.empty) snapshot = s;
            }
            if (!snapshot && email) {
                const s = await baseQuery.where("email", "==", email).limit(1).get();
                if (!s.empty) snapshot = s;
            }

            if (!snapshot || snapshot.empty) {
                return res.status(404).json({ success: false, message: "Student profile not found" });
            }

            const doc = snapshot.docs[0];
            await db.collection(COLLECTION).doc(doc.id).update(updateData);

            // Sync password to users collection if changed
            if (updateData.loginPassword) {
                const usersSnapshot = await db.collection("users")
                    .where("username", "==", username || "")
                    .limit(1).get();
                if (!usersSnapshot.empty) {
                    await db.collection("users").doc(usersSnapshot.docs[0].id).update({
                        password: updateData.loginPassword,
                        passwordHash: updateData.loginPasswordHash,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            return res.status(200).json({ success: true, message: "Profile updated successfully" });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while updating student profile"
            });
        }
    }
}
