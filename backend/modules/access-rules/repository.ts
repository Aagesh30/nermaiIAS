import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import {
  IEntityPermission, IAccessRequest, IBatchCapabilities, IPermissionTemplate,
  IPermissionAuditEntry, EntityType, AccessRequestStatus,
} from './types';

const COL_PERMISSIONS   = 'entity_permissions';
const COL_REQUESTS      = 'access_requests';
const COL_CAPABILITIES  = 'batch_capabilities';
const COL_TEMPLATES     = 'permission_templates';
const COL_AUDIT         = 'audit'; // sub-collection under entity_permissions

// ─── Entity Permissions ───────────────────────────────────────────────────────

export class AccessRulesRepository {

  async getPermission(entityId: string): Promise<IEntityPermission | null> {
    const doc = await db.collection(COL_PERMISSIONS).doc(entityId).get();
    if (!doc.exists) return null;
    return { ...(doc.data() as IEntityPermission), entityId: doc.id };
  }

  async setPermission(entityId: string, data: Partial<IEntityPermission>): Promise<void> {
    await db.collection(COL_PERMISSIONS).doc(entityId).set(data, { merge: true });
  }

  /**
   * Return all entity_permissions documents whose parentId is in the given set.
   * Used during cascade propagation.
   */
  async getChildPermissions(parentId: string, tenantId: string): Promise<IEntityPermission[]> {
    const snap = await db
      .collection(COL_PERMISSIONS)
      .where('parentId', '==', parentId)
      .where('tenantId', '==', tenantId)
      .get();
    return snap.docs.map(d => ({ ...(d.data() as IEntityPermission), entityId: d.id }));
  }

  /**
   * Return all entity_permissions for a given entity type within a tenant.
   * Used by the Permission Matrix endpoint.
   */
  async getPermissionsByType(entityType: EntityType, tenantId: string): Promise<IEntityPermission[]> {
    const snap = await db
      .collection(COL_PERMISSIONS)
      .where('entityType', '==', entityType)
      .where('tenantId', '==', tenantId)
      .get();
    return snap.docs.map(d => ({ ...(d.data() as IEntityPermission), entityId: d.id }));
  }

  // ─── Audit Log ──────────────────────────────────────────────────────────────

  async addAuditEntry(entityId: string, entry: IPermissionAuditEntry): Promise<void> {
    await db
      .collection(COL_PERMISSIONS)
      .doc(entityId)
      .collection(COL_AUDIT)
      .add({ ...entry, changedAt: new Date().toISOString() });
  }

  async getAuditLog(entityId: string): Promise<IPermissionAuditEntry[]> {
    const snap = await db
      .collection(COL_PERMISSIONS)
      .doc(entityId)
      .collection(COL_AUDIT)
      .orderBy('changedAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as IPermissionAuditEntry) }));
  }

  // ─── Access Requests ─────────────────────────────────────────────────────────

  async createAccessRequest(data: Omit<IAccessRequest, 'id'>): Promise<string> {
    const ref = await db.collection(COL_REQUESTS).add(data);
    return ref.id;
  }

  async getAccessRequest(requestId: string): Promise<IAccessRequest | null> {
    const doc = await db.collection(COL_REQUESTS).doc(requestId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as IAccessRequest) };
  }

  async listAccessRequests(tenantId: string, filters: {
    status?: AccessRequestStatus;
    entityId?: string;
    studentId?: string;
    limit?: number;
    startAfter?: string;
  }): Promise<IAccessRequest[]> {
    let query: FirebaseFirestore.Query = db
      .collection(COL_REQUESTS)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc');

    if (filters.status)   query = query.where('status', '==', filters.status);
    if (filters.entityId) query = query.where('entityId', '==', filters.entityId);
    if (filters.studentId) query = query.where('studentId', '==', filters.studentId);
    if (filters.startAfter) {
      const cursor = await db.collection(COL_REQUESTS).doc(filters.startAfter).get();
      if (cursor.exists) query = query.startAfter(cursor);
    }

    const snap = await query.limit(filters.limit ?? 50).get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as IAccessRequest) }));
  }

  async updateAccessRequest(requestId: string, data: Partial<IAccessRequest>): Promise<void> {
    await db.collection(COL_REQUESTS).doc(requestId).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }

  async getStudentPendingRequest(studentId: string, entityId: string): Promise<IAccessRequest | null> {
    const snap = await db
      .collection(COL_REQUESTS)
      .where('studentId', '==', studentId)
      .where('entityId', '==', entityId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as IAccessRequest) };
  }

  async getPendingRequestsByEntity(entityId: string, tenantId: string): Promise<IAccessRequest[]> {
    const snap = await db
      .collection(COL_REQUESTS)
      .where('entityId', '==', entityId)
      .where('tenantId', '==', tenantId)
      .where('status', '==', 'pending')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as IAccessRequest) }));
  }

  // ─── Batch Capabilities ───────────────────────────────────────────────────────

  async getBatchCapabilities(batchId: string): Promise<IBatchCapabilities | null> {
    const doc = await db.collection(COL_CAPABILITIES).doc(batchId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as IBatchCapabilities) };
  }

  async setBatchCapabilities(batchId: string, data: Partial<IBatchCapabilities>): Promise<void> {
    await db.collection(COL_CAPABILITIES).doc(batchId).set(data, { merge: true });
  }

  // ─── Permission Templates ─────────────────────────────────────────────────────

  async listTemplates(tenantId: string): Promise<IPermissionTemplate[]> {
    const snap = await db
      .collection(COL_TEMPLATES)
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as IPermissionTemplate) }));
  }

  async getTemplate(templateId: string): Promise<IPermissionTemplate | null> {
    const doc = await db.collection(COL_TEMPLATES).doc(templateId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as IPermissionTemplate) };
  }

  async createTemplate(data: Omit<IPermissionTemplate, 'id'>): Promise<string> {
    const ref = await db.collection(COL_TEMPLATES).add(data);
    return ref.id;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await db.collection(COL_TEMPLATES).doc(templateId).delete();
  }
}
