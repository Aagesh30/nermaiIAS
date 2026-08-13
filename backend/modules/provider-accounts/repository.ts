import { db } from '../../infrastructure/firebase';
import { IProviderAccount } from './types';
import { FieldValue } from 'firebase-admin/firestore';

export class ProviderAccountRepository {
  private collection = 'provider_accounts';

  async create(data: Omit<IProviderAccount, 'id'>): Promise<IProviderAccount> {
    const docRef = await db.collection(this.collection).add({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data };
  }

  async findById(id: string): Promise<IProviderAccount | null> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as IProviderAccount;
  }

  async findAll(tenantId?: string): Promise<IProviderAccount[]> {
    let query: FirebaseFirestore.Query = db.collection(this.collection);
    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }
    const snapshot = await query.get();
    return snapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as IProviderAccount));
  }

  async update(id: string, updates: Partial<IProviderAccount>): Promise<void> {
    await db.collection(this.collection).doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async delete(id: string): Promise<void> {
    await db.collection(this.collection).doc(id).delete();
  }

  /**
   * Automatically acquire the best provider account.
   */
  async acquireAccount(provider: string, tenantId?: string): Promise<IProviderAccount | null> {
    let query: FirebaseFirestore.Query = db.collection(this.collection)
      .where('isActive', '==', true)
      .where('provider', '==', provider)
      .where('status', 'in', ['healthy', 'busy']);

    if (tenantId) {
      query = query.where('tenantId', '==', tenantId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) return null;

    const accounts = snapshot.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as IProviderAccount));

    // Sort accounts:
    // 1. Filter out accounts that are at max capacity
    const available = accounts.filter(a => a.currentRunningMeetings < a.maxConcurrentMeetings);
    if (available.length === 0) return null;

    // 2. Sort by current running meetings (lowest first), then by priority (highest first)
    available.sort((a, b) => {
      if (a.currentRunningMeetings !== b.currentRunningMeetings) {
        return a.currentRunningMeetings - b.currentRunningMeetings;
      }
      return (b.priority || 0) - (a.priority || 0); // descending priority
    });

    const selected = available[0];

    // Atomic Reserve
    const success = await db.runTransaction(async (t) => {
      const docRef = db.collection(this.collection).doc(selected.id!);
      const doc = await t.get(docRef);
      if (!doc.exists) return false;
      
      const data = doc.data() as IProviderAccount;
      const currentLoad = data.currentRunningMeetings || 0;
      const maxLoad = data.maxConcurrentMeetings || 1;
      
      if (currentLoad >= maxLoad) return false; // taken concurrently
      
      t.update(docRef, {
        currentRunningMeetings: currentLoad + 1,
        updatedAt: new Date().toISOString()
      });
      return true;
    });

    if (!success) {
      return null; 
    }

    return selected;
  }

  async releaseAccount(id: string): Promise<void> {
    await db.runTransaction(async (t) => {
      const docRef = db.collection(this.collection).doc(id);
      const doc = await t.get(docRef);
      if (!doc.exists) return;
      
      const currentLoad = doc.data()?.currentRunningMeetings || 0;
      t.update(docRef, {
        currentRunningMeetings: Math.max(0, currentLoad - 1),
        updatedAt: new Date().toISOString()
      });
    });
  }
}
