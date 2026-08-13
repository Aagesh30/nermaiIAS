import { getFirestore } from 'firebase-admin/firestore';
import { IAnnouncement } from './types';

export class AnnouncementRepository {
  private db = getFirestore();

  async create(announcement: IAnnouncement): Promise<IAnnouncement> {
    const docRef = this.db.collection('announcements').doc();
    const newDoc = {
      ...announcement,
      id: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(newDoc);
    return newDoc;
  }

  async update(id: string, updates: Partial<IAnnouncement>): Promise<void> {
    await this.db.collection('announcements').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async findById(id: string): Promise<IAnnouncement | null> {
    const doc = await this.db.collection('announcements').doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as IAnnouncement;
  }

  async listForTenant(tenantId: string): Promise<IAnnouncement[]> {
    const snapshot = await this.db.collection('announcements')
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .get();
      
    const announcements = snapshot.docs.map(doc => doc.data() as IAnnouncement);
    // Sort in memory to avoid composite index requirements
    return announcements.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async listForStudent(tenantId: string, batchIds: string[], courseIds: string[]): Promise<IAnnouncement[]> {
    // This query grabs global announcements. We'll handle batch/course specific ones below,
    // or through multiple parallel queries for simplicity in Firestore.
    const globalSnapshot = await this.db.collection('announcements')
      .where('tenantId', '==', tenantId)
      .where('visibility', '==', 'global')
      .where('status', '==', 'published')
      .where('isDeleted', '==', false)
      .get();
      
    let announcements = globalSnapshot.docs.map(doc => doc.data() as IAnnouncement);

    // Get batch announcements if student has batches
    if (batchIds.length > 0) {
      // Note: In a production app, we would chunk array-contains-any if length > 10
      const batchSnapshot = await this.db.collection('announcements')
        .where('tenantId', '==', tenantId)
        .where('visibility', '==', 'batch')
        .where('status', '==', 'published')
        .where('isDeleted', '==', false)
        .where('targetBatchIds', 'array-contains-any', batchIds)
        .get();
      announcements = [...announcements, ...batchSnapshot.docs.map(doc => doc.data() as IAnnouncement)];
    }

    if (courseIds.length > 0) {
      const courseSnapshot = await this.db.collection('announcements')
        .where('tenantId', '==', tenantId)
        .where('visibility', '==', 'course')
        .where('status', '==', 'published')
        .where('isDeleted', '==', false)
        .where('targetCourseIds', 'array-contains-any', courseIds)
        .get();
      announcements = [...announcements, ...courseSnapshot.docs.map(doc => doc.data() as IAnnouncement)];
    }

    // Sort combined results locally
    return announcements.sort((a, b) => new Date(b.publishedAt || b.createdAt!).getTime() - new Date(a.publishedAt || a.createdAt!).getTime());
  }

  async delete(id: string): Promise<void> {
    await this.db.collection('announcements').doc(id).update({
      isDeleted: true,
      updatedAt: new Date().toISOString()
    });
  }
}
