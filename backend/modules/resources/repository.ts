import { db } from '../../infrastructure/firebase';
import { IResource } from './types';

export class ResourceRepository {
  private readonly collection = db.collection('resources');

  async create(data: IResource, userId: string): Promise<IResource> {
    const docRef = this.collection.doc();
    const timestamp = new Date().toISOString();
    const resource: IResource = {
      ...data,
      id: docRef.id,
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await docRef.set(resource);
    return resource;
  }

  async findById(id: string): Promise<IResource | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as IResource;
  }

  async update(id: string, data: Partial<IResource>, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async list(filters: { tenantId?: string; courseId?: string; subjectId?: string; topicId?: string; classId?: string; batchId?: string; categoryId?: string; search?: string }): Promise<IResource[]> {
    let query: FirebaseFirestore.Query = this.collection;
    
    if (filters.tenantId) query = query.where('tenantId', '==', filters.tenantId);
    if (filters.courseId) query = query.where('courseIds', 'array-contains', filters.courseId);
    if (filters.subjectId) query = query.where('subjectIds', 'array-contains', filters.subjectId);
    if (filters.topicId) query = query.where('topicIds', 'array-contains', filters.topicId);
    if (filters.classId) query = query.where('classIds', 'array-contains', filters.classId);
    if (filters.batchId) query = query.where('batchIds', 'array-contains', filters.batchId);
    if (filters.categoryId) query = query.where('categoryId', '==', filters.categoryId);

    const snapshot = await query.get();
    let resources = snapshot.docs.map(doc => doc.data() as IResource);

    if (filters.search) {
      const s = filters.search.toLowerCase();
      resources = resources.filter(r => r.title.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
    }

    // Sort by displayOrder
    resources.sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    return resources;
  }
}
