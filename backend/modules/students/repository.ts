import { db } from '../../infrastructure/firebase';
import { STUDENT_COLLECTIONS } from './constants';
import { IStudentProfile, IEnrollment, IBatch } from './types';
import { BaseAuditFields } from '../../core/types';

class BaseRepository {
  protected generateAuditFields(userId: string): BaseAuditFields {
    return {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };
  }

  protected generateUpdateAuditFields(userId: string): Partial<BaseAuditFields> {
    return {
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
  }
}

export class StudentProfileRepository extends BaseRepository {
  private collection = db.collection(STUDENT_COLLECTIONS.PROFILES);

  async create(id: string, data: Omit<IStudentProfile, keyof BaseAuditFields | 'id'>, adminId: string): Promise<IStudentProfile> {
    const payload: IStudentProfile = {
      ...data,
      id,
      ...this.generateAuditFields(adminId),
    };
    await this.collection.doc(id).set(payload);
    return payload;
  }

  async update(id: string, data: Partial<IStudentProfile>, adminId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(adminId),
    };
    await this.collection.doc(id).update(payload);
  }

  async findById(id: string): Promise<IStudentProfile | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as IStudentProfile;
    if (data.isDeleted) return null;
    return data;
  }

  async findAllByTenant(tenantId: string): Promise<IStudentProfile[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as IStudentProfile);
  }

  async softDelete(id: string, adminId: string): Promise<void> {
    const payload = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: adminId,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    await this.collection.doc(id).update(payload);
  }
}

export class EnrollmentRepository extends BaseRepository {
  private collection = db.collection(STUDENT_COLLECTIONS.ENROLLMENTS);

  async create(data: Omit<IEnrollment, keyof BaseAuditFields | 'id'>, adminId: string): Promise<IEnrollment> {
    const docRef = this.collection.doc();
    const payload: IEnrollment = {
      ...data,
      ...this.generateAuditFields(adminId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<IEnrollment>, adminId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(adminId),
    };
    await this.collection.doc(id).update(payload);
  }

  async findByStudentId(studentId: string): Promise<IEnrollment[]> {
    const snapshot = await this.collection
      .where('studentId', '==', studentId)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as IEnrollment);
  }
  
  async findByStudentAndCourse(studentId: string, courseId: string): Promise<IEnrollment | null> {
    const snapshot = await this.collection
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .where('isDeleted', '==', false)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as IEnrollment;
  }
}

export class BatchRepository extends BaseRepository {
  private collection = db.collection(STUDENT_COLLECTIONS.BATCHES);

  async create(data: Omit<IBatch, keyof BaseAuditFields | 'id'>, adminId: string): Promise<IBatch> {
    const docRef = this.collection.doc();
    const payload: IBatch = {
      ...data,
      ...this.generateAuditFields(adminId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<IBatch>, adminId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(adminId),
    };
    await this.collection.doc(id).update(payload);
  }

  async findById(id: string): Promise<IBatch | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as IBatch;
    if (data.isDeleted) return null;
    return data;
  }

  async findAllByTenant(tenantId: string): Promise<IBatch[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as IBatch);
  }

  async softDelete(id: string, adminId: string): Promise<void> {
    const payload = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: adminId,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    await this.collection.doc(id).update(payload);
  }
}
