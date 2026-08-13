import { db } from '../../infrastructure/firebase';
import { IFaq } from './types';
import { BaseAuditFields } from '../../core/types';

class BaseRepository {
  protected getCreateAuditFields(adminId: string) {
    return {
      createdAt: new Date().toISOString(),
      createdBy: adminId,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };
  }
  
  protected getUpdateAuditFields(adminId: string) {
    return {
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    };
  }
  
  protected getDeleteAuditFields(adminId: string) {
    return {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: adminId
    };
  }
}

export class FaqRepository extends BaseRepository {
  private collection = db.collection('tenant_faqs');

  async create(data: Omit<IFaq, keyof BaseAuditFields | 'id'>, adminId: string): Promise<IFaq> {
    const payload: IFaq = {
      ...data,
      ...this.getCreateAuditFields(adminId)
    };
    const docRef = await this.collection.add(payload);
    return { ...payload, id: docRef.id };
  }

  async update(id: string, data: Partial<IFaq>, adminId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.getUpdateAuditFields(adminId)
    };
    await this.collection.doc(id).update(payload);
  }

  async findById(id: string): Promise<IFaq | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as IFaq;
  }

  async listForTenant(tenantId: string): Promise<IFaq[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .orderBy('order', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IFaq));
  }

  async delete(id: string, adminId: string): Promise<void> {
    await this.collection.doc(id).update(this.getDeleteAuditFields(adminId));
  }
}
