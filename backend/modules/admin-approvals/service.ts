import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

// ─── LMS feature keys — excluded from this system (separate LMS logic) ───────
const LMS_FEATURE_PREFIXES = ['lms_'];

function isLmsFeature(featureKey: string): boolean {
  return LMS_FEATURE_PREFIXES.some(prefix => featureKey.startsWith(prefix));
}

// ─── Collection name for approval requests ────────────────────────────────────
const COLLECTION = 'admin_approvals';

export interface IAdminApprovalRequest {
  id: string;
  featureKey: string;
  actionType: 'create' | 'edit' | 'delete';
  targetCollection: string;
  docId: string | null;
  proposedPayload: Record<string, any>;
  requestedBy: string;
  requestedByUserId: string;
  requestedByRole: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class AdminApprovalService {

  // ─── Submit a new approval request ──────────────────────────────────────────
  async submitRequest(params: {
    featureKey: string;
    actionType: 'create' | 'edit' | 'delete';
    targetCollection: string;
    docId: string | null;
    proposedPayload: Record<string, any>;
    requestedBy: string;
    requestedByUserId: string;
    requestedByRole: string;
  }): Promise<IAdminApprovalRequest> {

    if (isLmsFeature(params.featureKey)) {
      throw new AppError('LMS features use a separate approval system.', 400);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const request: IAdminApprovalRequest = {
      id,
      featureKey: params.featureKey,
      actionType: params.actionType,
      targetCollection: params.targetCollection,
      docId: params.docId,
      proposedPayload: params.proposedPayload,
      requestedBy: params.requestedBy,
      requestedByUserId: params.requestedByUserId,
      requestedByRole: params.requestedByRole,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(COLLECTION).doc(id).set(request);
    return request;
  }

  // ─── List pending approval requests (super admin only) ───────────────────────
  async listPending(): Promise<IAdminApprovalRequest[]> {
    const snap = await db.collection(COLLECTION)
      .where('status', '==', 'pending')
      .get();

    const results = snap.docs.map(doc => doc.data() as IAdminApprovalRequest);
    results.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    return results;
  }

  // ─── Approve & Apply — the core of the fix ──────────────────────────────────
  async approveAndApply(approvalId: string, superAdminId: string): Promise<{ success: boolean; message: string }> {
    const docRef = db.collection(COLLECTION).doc(approvalId);
    const snap = await docRef.get();

    if (!snap.exists) throw new AppError('Approval request not found', 404);

    const request = snap.data() as IAdminApprovalRequest;
    if (request.status !== 'pending') throw new AppError('Request is no longer pending', 400);

    // Apply the change using proper business logic
    await this.applyChange(request);

    // Mark as approved
    await docRef.update({
      status: 'approved',
      approvedBy: superAdminId,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, message: 'Approved and applied successfully.' };
  }

  // ─── Reject a request ───────────────────────────────────────────────────────
  async rejectRequest(approvalId: string, superAdminId: string, reason: string): Promise<{ success: boolean }> {
    const docRef = db.collection(COLLECTION).doc(approvalId);
    const snap = await docRef.get();

    if (!snap.exists) throw new AppError('Approval request not found', 404);

    const request = snap.data() as IAdminApprovalRequest;
    if (request.status !== 'pending') throw new AppError('Request is no longer pending', 400);

    await docRef.update({
      status: 'rejected',
      rejectionReason: reason,
      approvedBy: superAdminId,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // ─── Internal: route to correct business logic ───────────────────────────────
  private async applyChange(request: IAdminApprovalRequest): Promise<void> {
    const { featureKey, actionType, docId, proposedPayload } = request;
    // ── Resolve Firestore collection name per feature ──────────────────────────
    const collectionMap: Record<string, string> = {
      student_management: 'students',
      staff_management: 'staff',
      batch_management: 'batches',
      fees_management: 'students',       // fees live on the student doc
      marks_management: 'students',      // marks also live on the student doc
      id_card: 'students',
      hall_ticket: 'students',
      profile_requests: 'profile_requests',
      test_creation: 'tests',
      question_bank: 'questions',
      // CRM
      crm_leads: 'leads',
      crm_campaigns: 'campaigns',
      crm_admissions: 'admissions',
      crm_fee_reminders: 'fee_reminders',
      crm_freebies: 'freebies',
      crm_courses: 'crm_courses',
      crm_inquiry: 'inquiries',
      crm_guest_posters: 'guest_posters',
      crm_alumni_feedback: 'alumni_feedback',
      // announcements / notifications
      announcements: 'announcements',
      notifications: 'notifications',
    };

    // Allow targetCollection from the request as first priority, then fall back to map
    const resolvedCollection = request.targetCollection || collectionMap[featureKey] || featureKey;

    if (!resolvedCollection) {
      throw new AppError(`No collection mapping found for feature: ${featureKey}`, 400);
    }

    // ── Feature-specific business logic ──────────────────────────────────────
    // For student_management edits: use the full update logic (fees, password sync, etc.)
    if (featureKey === 'student_management' && actionType === 'edit' && docId) {
      await this.applyStudentUpdate(docId, proposedPayload);
      return;
    }

    // For staff_management edits: use the full update logic (users collection sync)
    if (featureKey === 'staff_management' && actionType === 'edit' && docId) {
      await this.applyStaffUpdate(docId, proposedPayload);
      return;
    }

    // For all other features: apply a clean Firestore update/create/delete
    // This is still better than the old developer endpoint because:
    //  - It uses the correct resolved collection name
    //  - It never writes invalid data from wrong collection mappings
    //  - The payload was validated at submission time via the real API route

    if (actionType === 'delete') {
      if (!docId) throw new AppError('docId is required for delete action', 400);
      const ref = db.collection(resolvedCollection).doc(docId);
      const docSnap = await ref.get();
      if (docSnap.exists) {
        // Soft delete if supported, otherwise hard delete
        const data = docSnap.data() || {};
        if ('isDeleted' in data) {
          await ref.update({
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: 'super_admin_approval',
          });
        } else {
          await ref.delete();
        }
      }
      return;
    }

    if (actionType === 'create') {
      const newId = proposedPayload.id || uuidv4();
      const payload = {
        ...proposedPayload,
        id: newId,
        createdAt: proposedPayload.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection(resolvedCollection).doc(newId).set(payload);
      return;
    }

    if (actionType === 'edit') {
      if (!docId) throw new AppError('docId is required for edit action', 400);
      const updatePayload: Record<string, any> = {
        ...proposedPayload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'super_admin_approval',
      };
      // Remove fields that should not be blindly overwritten
      delete updatePayload['id'];
      delete updatePayload['createdAt'];
      delete updatePayload['createdBy'];
      await db.collection(resolvedCollection).doc(docId).update(updatePayload);
      return;
    }
  }

  // ─── Full student update logic (mirrors StudentController.update) ─────────────
  private async applyStudentUpdate(id: string, payload: any): Promise<void> {
    const docRef = db.collection('students').doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.isDeleted) {
      throw new AppError(`Student ${id} not found`, 404);
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'super_admin_approval',
    };

    // Apply all safe fields from the proposed payload
    const allowedFields = [
      'admissionNumber', 'rollNumber', 'firstName', 'lastName', 'dateOfBirth', 'dob',
      'gender', 'bloodGroup', 'community', 'fatherName', 'occupation', 'altPhone',
      'qualification', 'college', 'referralSource', 'email', 'phone', 'address',
      'city', 'state', 'pincode', 'batch', 'batches', 'batchModes', 'course',
      'academicYear', 'status', 'photoUrl', 'motherName', 'guardianName',
      'fatherPhone', 'motherPhone', 'guardianPhone', 'emergencyContact',
      'previousSchool', 'previousClass', 'previousMarks', 'type', 'joiningDate',
      'attendedDays', 'totalDays', 'loginUsername', 'profileEditPermission',
      'isProfileSubmitted', 'profileSubmitCount',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    }

    // Handle fees — only if present in payload
    if (payload.totalFees !== undefined) updateData.totalFees = Number(payload.totalFees);
    if (payload.feesPaid !== undefined) {
      const currentDoc = doc.data()!;
      const previousPaid = Number(currentDoc.feesPaid || 0);
      const newPaidAmount = Number(payload.feesPaid);
      updateData.feesPaid = newPaidAmount;

      // Append installment if payment increased
      const incrementalAmount = newPaidAmount - previousPaid;
      if (incrementalAmount > 0) {
        const existingInstallments: any[] = Array.isArray(currentDoc.feeInstallments)
          ? currentDoc.feeInstallments : [];
        const newInstallment = {
          installmentNo: existingInstallments.length + 1,
          amount: incrementalAmount,
          date: new Date().toISOString(),
          modeOfPayment: payload.modeOfPayment || 'cash',
          transactionId: payload.transactionId || '',
          recordedBy: 'super_admin_approval',
          note: 'Applied via approval system',
        };
        updateData.feeInstallments = admin.firestore.FieldValue.arrayUnion(newInstallment);
      }
    }

    // Handle batches reconciliation
    if (payload.batches !== undefined) {
      updateData.batches = Array.isArray(payload.batches) ? payload.batches : [];
      updateData.batch = updateData.batches[0] || '';
    }
    if (payload.batchModes !== undefined) {
      updateData.batchModes = (payload.batchModes && typeof payload.batchModes === 'object') ? payload.batchModes : {};
    }

    await docRef.update(updateData);

    // Sync loginUsername to users collection if changed
    if (payload.loginUsername !== undefined) {
      try {
        const uSnap = await db.collection('users').where('studentId', '==', id).limit(1).get();
        if (!uSnap.empty) {
          await uSnap.docs[0].ref.update({
            username: payload.loginUsername,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (_) { /* best-effort */ }
    }
  }

  // ─── Full staff update logic (mirrors StaffController.update) ─────────────────
  private async applyStaffUpdate(id: string, payload: any): Promise<void> {
    const docRef = db.collection('staff').doc(id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.isDeleted) {
      throw new AppError(`Staff member ${id} not found`, 404);
    }

    const staffData = doc.data()!;
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'super_admin_approval',
    };

    const allowedFields = [
      'employeeId', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'bloodGroup',
      'email', 'phone', 'address', 'city', 'state', 'pincode', 'designation',
      'department', 'qualification', 'experienceYears', 'salary', 'joiningDate',
      'photoUrl', 'emergencyContact', 'role', 'loginUsername', 'customPermissions',
    ];

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    }

    if (payload.loginPassword !== undefined && payload.loginPassword !== '') {
      updateData.loginPassword = payload.loginPassword;
    }

    await docRef.update(updateData);

    // Sync with users collection
    const prevUsername = staffData.loginUsername;
    const currentUsername = payload.loginUsername !== undefined ? payload.loginUsername : prevUsername;

    if (currentUsername) {
      try {
        const userSnapshot = await db.collection('users')
          .where('username', '==', prevUsername || currentUsername)
          .limit(1)
          .get();

        const userUpdateData: any = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (payload.loginUsername !== undefined) userUpdateData.username = payload.loginUsername;
        if (payload.loginPassword !== undefined && payload.loginPassword !== '') {
          userUpdateData.password = payload.loginPassword;
        }
        if (payload.role !== undefined) userUpdateData.role = payload.role;
        if (payload.firstName !== undefined || payload.lastName !== undefined) {
          const firstName = payload.firstName !== undefined ? payload.firstName : staffData.firstName;
          const lastName = payload.lastName !== undefined ? payload.lastName : staffData.lastName;
          userUpdateData.name = `${firstName} ${lastName}`;
        }
        if (payload.customPermissions !== undefined) userUpdateData.customPermissions = payload.customPermissions;

        if (!userSnapshot.empty) {
          await userSnapshot.docs[0].ref.update(userUpdateData);
        }
      } catch (_) { /* best-effort */ }
    }
  }
}
