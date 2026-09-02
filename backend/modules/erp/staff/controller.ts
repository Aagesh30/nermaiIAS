import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();
const COLLECTION = "staff";

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

export class StaffController {
    /**
     * CREATE STAFF / ADMIN
     * POST /api/erp/staff
     */
    static async create(req: Request, res: Response) {
        try {
            const {
                employeeId,
                firstName,
                lastName,
                dateOfBirth,
                gender,
                bloodGroup,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                designation,
                department,
                qualification,
                experienceYears,
                salary,
                joiningDate,
                photoUrl,
                emergencyContact,
                createdBy,
                loginUsername,
                loginPassword,
                role,
                customPermissions
            } = req.body;

            if (!firstName || !lastName || !designation) {
                return res.status(400).json({
                    success: false,
                    message: "First name, last name, and designation are required"
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
                        message: "Username already exists in the authentication directory"
                    });
                }
            }

            const id = randomUUID();
            const resolvedRole = role || "admin";
            const payload = {
                id,
                employeeId: employeeId || "",
                firstName,
                lastName,
                dateOfBirth: dateOfBirth || "",
                gender: gender || "",
                bloodGroup: bloodGroup || "",
                email: email || "",
                phone: phone || "",
                address: address || "",
                city: city || "",
                state: state || "",
                pincode: pincode || "",
                designation,
                department: department || "",
                qualification: qualification || "",
                experienceYears: experienceYears || 0,
                salary: salary || 0,
                joiningDate: joiningDate || "",
                photoUrl: photoUrl || "",
                emergencyContact: emergencyContact || "",
                loginUsername: loginUsername || "",
                loginPassword: loginPassword || "",
                role: resolvedRole,
                customPermissions: customPermissions || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(COLLECTION).doc(id).set(payload);

            if (loginUsername && loginPassword) {
                const userId = randomUUID();
                const userPayload = {
                    id: userId,
                    username: loginUsername,
                    password: loginPassword,
                    name: `${firstName} ${lastName}`,
                    email: email || "",
                    role: resolvedRole,
                    customPermissions: customPermissions || null,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: createdBy || "admin",
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null
                };
                await db.collection("users").doc(userId).set(userPayload);
            }

            return res.status(201).json({
                success: true,
                message: "Admin created successfully",
                data: {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while creating"
            });
        }
    }


    /**
     * GET ALL STAFF (WITH SEARCH, FILTER, PAGINATION, SORTING)
     * GET /api/erp/staff
     */
    static async getAll(req: Request, res: Response) {
        try {
            const {
                search,
                department,
                designation,
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
            let staff = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: data.id || doc.id,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt),
                    deletedAt: parseTimestamp(data.deletedAt)
                };
            });

            // 1. Filter in-memory
            staff = staff.filter((member: any) => {
                if (member.isDeleted === true) return false;
                if (department && member.department !== department) return false;
                if (designation && member.designation !== designation) return false;
                return true;
            });

            // 2. Search filter in-memory
            if (search) {
                const searchLower = (search as string).toLowerCase();
                staff = staff.filter((member: any) =>
                    member.firstName?.toLowerCase().includes(searchLower) ||
                    member.lastName?.toLowerCase().includes(searchLower) ||
                    member.employeeId?.toLowerCase().includes(searchLower) ||
                    member.email?.toLowerCase().includes(searchLower) ||
                    member.phone?.includes(searchLower)
                );
            }

            // 3. Sort in-memory
            const sortField = sortBy as string;
            const orderDirection = sortOrder === "asc" ? 1 : -1;
            staff.sort((a: any, b: any) => {
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
                const foundIndex = staff.findIndex((member: any) => member.id === startAfter);
                if (foundIndex !== -1) {
                    startIndex = foundIndex + 1;
                }
            }

            const limitNum = parseInt(limit as string, 10);
            const paginatedStaff = staff.slice(startIndex, startIndex + limitNum);
            const hasMore = startIndex + limitNum < staff.length;
            const nextPageToken = paginatedStaff.length > 0 && hasMore ? (paginatedStaff[paginatedStaff.length - 1] as any).id : null;

            return res.status(200).json({
                success: true,
                data: paginatedStaff,
                pagination: {
                    limit: limitNum,
                    nextPageToken,
                    hasMore
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message || "Failed to fetch staff" });
        }
    }

    /**
     * GET SINGLE STAFF
     * GET /api/erp/staff/:id
     */
    static async getOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const doc = await db.collection(COLLECTION).doc(id).get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Staff not found"
                });
            }

            const data = doc.data()!;
            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    id: data.id || doc.id,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt),
                    deletedAt: parseTimestamp(data.deletedAt)
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving the staff"
            });
        }
    }

    /**
     * UPDATE STAFF
     * PUT /api/erp/staff/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const {
                employeeId,
                firstName,
                lastName,
                dateOfBirth,
                gender,
                bloodGroup,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                designation,
                department,
                qualification,
                experienceYears,
                salary,
                joiningDate,
                photoUrl,
                emergencyContact,
                updatedBy,
                role,
                loginUsername,
                loginPassword,
                customPermissions
            } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Admin not found"
                });
            }

            const updateData: any = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: updatedBy || "admin"
            };

            if (employeeId !== undefined) updateData.employeeId = employeeId;
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
            if (gender !== undefined) updateData.gender = gender;
            if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
            if (email !== undefined) updateData.email = email;
            if (phone !== undefined) updateData.phone = phone;
            if (address !== undefined) updateData.address = address;
            if (city !== undefined) updateData.city = city;
            if (state !== undefined) updateData.state = state;
            if (pincode !== undefined) updateData.pincode = pincode;
            if (designation !== undefined) updateData.designation = designation;
            if (department !== undefined) updateData.department = department;
            if (qualification !== undefined) updateData.qualification = qualification;
            if (experienceYears !== undefined) updateData.experienceYears = experienceYears;
            if (salary !== undefined) updateData.salary = salary;
            if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
            if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
            if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
            if (role !== undefined) updateData.role = role;
            if (loginUsername !== undefined) updateData.loginUsername = loginUsername;
            if (loginPassword !== undefined && loginPassword !== "") updateData.loginPassword = loginPassword;
            if (customPermissions !== undefined) updateData.customPermissions = customPermissions;

            await docRef.update(updateData);

            // Sync with users collection
            const staffData = doc.data()!;
            const prevUsername = staffData.loginUsername;
            const currentUsername = loginUsername !== undefined ? loginUsername : prevUsername;
            const currentPassword = loginPassword !== undefined ? loginPassword : staffData.loginPassword;
            const currentRole = role !== undefined ? role : (staffData.role || "admin");
            const currentName = `${firstName !== undefined ? firstName : staffData.firstName} ${lastName !== undefined ? lastName : staffData.lastName}`;
            const currentEmail = email !== undefined ? email : staffData.email;
            const currentPermissions = customPermissions !== undefined ? customPermissions : staffData.customPermissions;

            if (currentUsername) {
                const userSnapshot = await db.collection("users")
                    .where("username", "==", prevUsername || currentUsername)
                    .limit(1)
                    .get();

                if (!userSnapshot.empty) {
                    const userDocId = userSnapshot.docs[0].id;
                    await db.collection("users").doc(userDocId).update({
                        username: currentUsername,
                        name: currentName,
                        email: currentEmail || "",
                        role: currentRole,
                        customPermissions: currentPermissions || null,
                        ...(loginPassword ? { password: loginPassword } : {})
                    });
                } else if (currentPassword) {
                    const userId = randomUUID();
                    await db.collection("users").doc(userId).set({
                        id: userId,
                        username: currentUsername,
                        password: currentPassword,
                        name: currentName,
                        email: currentEmail || "",
                        role: currentRole,
                        customPermissions: currentPermissions || null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: updatedBy || "admin",
                        isDeleted: false,
                        deletedAt: null,
                        deletedBy: null
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: "Admin updated successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while updating the admin"
            });
        }
    }

    /**
     * SOFT DELETE STAFF
     * DELETE /api/erp/staff/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { deletedBy } = req.body;

            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists || doc.data()?.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Staff not found"
                });
            }

            await docRef.update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: deletedBy || "admin"
            });

            // Sync deletion with users collection
            const staffData = doc.data();
            if (staffData && staffData.loginUsername) {
                const userSnapshot = await db.collection("users")
                    .where("username", "==", staffData.loginUsername)
                    .get();
                for (const userDoc of userSnapshot.docs) {
                    await db.collection("users").doc(userDoc.id).update({
                        isDeleted: true,
                        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                        deletedBy: deletedBy || "admin"
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: "Staff deleted successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting the staff"
            });
        }
    }

    /**
     * GET CURRENT LOGGED-IN STAFF PROFILE
     * GET /api/erp/staff/profile/me
     */
    static async getMe(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }
            
            const username = req.user.username;
            const email = req.user.email;
            
            if (!username && !email) {
                return res.status(400).json({ success: false, message: "No identity credentials in token" });
            }
            
            const parseTimestamp = (val: any) => {
                if (!val) return null;
                if (typeof val.toDate === "function") return val.toDate().toISOString();
                return new Date(val).toISOString();
            };

            let query = db.collection(COLLECTION).where("isDeleted", "==", false);
            let snapshot;
            
            if (username) {
                snapshot = await query.where("loginUsername", "==", username).limit(1).get();
            }
            
            if ((!snapshot || snapshot.empty) && email) {
                snapshot = await query.where("email", "==", email).limit(1).get();
            }
            
            if (!snapshot || snapshot.empty) {
                return res.status(404).json({ success: false, message: "Staff profile not found" });
            }
            
            const doc = snapshot.docs[0];
            const data = doc.data();
            
            return res.status(200).json({
                success: true,
                data: {
                    ...data,
                    id: data.id || doc.id,
                    createdAt: parseTimestamp(data.createdAt),
                    updatedAt: parseTimestamp(data.updatedAt)
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching profile"
            });
        }
    }

    static async getLiveSessionCandidates(req: Request, res: Response) {
        try {
            const usersSnap = await db.collection("users").get();
            const teachers: any[] = [];
            const management: any[] = [];
            const admins: any[] = [];

            usersSnap.docs.forEach(doc => {
                const u = doc.data();
                const id = doc.id;
                const name = u.name || u.username || '';
                const role = u.role;
                const isDeleted = u.isDeleted === true;

                if (isDeleted) return;

                const candidate = { id, name, role };
                if (role === 'teacher' || role === 'staff') {
                    teachers.push(candidate);
                } else if (role === 'admin' || role === 'super_admin' || role === 'management' || role === 'contributor') {
                    admins.push(candidate);
                }
            });

            return res.status(200).json({
                success: true,
                data: {
                    teachers,
                    management,
                    admins
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching candidates"
            });
        }
    }

    static async getStaffLiveSessionsMe(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }
            const { LiveSessionService } = require("../../live-sessions/service");
            const sessions = await LiveSessionService.listSessions({}, req.user);
            return res.status(200).json({ success: true, data: sessions });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching live sessions"
            });
        }
    }

    static async getStaffLiveSessionsById(req: Request, res: Response) {
        try {
            const staffUserId = req.params.id;
            const { LiveSessionService } = require("../../live-sessions/service");
            const userDoc = await db.collection("users").doc(staffUserId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ success: false, message: "Staff user not found" });
            }
            const userData = userDoc.data()!;
            const targetUser = {
                userId: staffUserId,
                role: userData.role || 'teacher'
            };
            const sessions = await LiveSessionService.listSessions({}, targetUser);
            return res.status(200).json({ success: true, data: sessions });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while fetching live sessions"
            });
        }
    }
}
