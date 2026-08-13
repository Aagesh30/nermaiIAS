import { db } from '../../infrastructure/firebase';
import { LMS_COLLECTIONS } from './constants';
import { BaseAuditFields } from '../../core/types';
import { ICourse, ISubject, ITopic, ISubtopic, IClass } from './types';

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

export class CourseRepository extends BaseRepository {
  private collection = db.collection(LMS_COLLECTIONS.COURSES);

  async create(data: Omit<ICourse, keyof BaseAuditFields>, userId: string): Promise<ICourse> {
    const docRef = this.collection.doc();
    const payload: ICourse = {
      ...data,
      ...this.generateAuditFields(userId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<ICourse>, userId: string): Promise<void> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      // If the document does not exist (e.g. editing a virtual course or CRM course),
      // materialize it by initializing with audit fields + the new data
      const payload: ICourse = {
        ...this.generateAuditFields(userId),
        name: data.name || '',
        description: data.description || '',
        price: data.price ?? 0,
        visibility: data.visibility || 'restricted',
        ...data,
        id,
        tenantId: data.tenantId || 'default_tenant',
      };
      await docRef.set(payload);
    } else {
      const payload = {
        ...data,
        ...this.generateUpdateAuditFields(userId),
      };
      await docRef.update(payload);
    }
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  async findById(id: string): Promise<ICourse | null> {
    // Support virtual ERP courses in findById lookup
    if (id.startsWith('erp_course_')) {
      const rawName = id.substring('erp_course_'.length).split('_').map(w => w.toUpperCase()).join(' ');
      return {
        id,
        tenantId: 'default_tenant',
        name: rawName,
        description: `Course synced from ERP batch (${rawName})`,
        price: 0,
        visibility: 'restricted',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
        deletedAt: null,
        deletedBy: null
      };
    }

    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as any;
    if (data.isDeleted) return null;

    // Support CRM courses without tenantId
    if (!data.tenantId) {
      return {
        ...data,
        tenantId: 'default_tenant',
        price: data.price ?? data.fee ?? 0,
        visibility: data.visibility || 'restricted',
      };
    }
    return data;
  }

  async findAllByTenant(tenantId: string): Promise<ICourse[]> {
    // ── SOURCE 1: Existing LMS-native courses (unchanged original query) ──────
    const lmsSnapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .get();
    const lmsCourses: ICourse[] = lmsSnapshot.docs.map((doc: any) => doc.data() as ICourse);

    // Track IDs and names already collected so we can deduplicate below
    const seenIds  = new Set<string>(lmsCourses.map(c => c.id as string));
    const seenNames = new Set<string>(lmsCourses.map(c => (c.name || '').toLowerCase()));

    // ── SOURCE 2: CRM-style courses in the same 'courses' collection ─────────
    // These were created via /api/crm/courses and have no tenantId but DO have
    // isActive / fee fields.  We map them to the ICourse shape so the LMS can
    // display and reference them.
    let crmCourses: ICourse[] = [];
    try {
      const crmSnapshot = await this.collection
        .where('isDeleted', '==', false)
        .get();

      crmSnapshot.docs.forEach((doc: any) => {
        const d = doc.data() as any;
        // Skip if already in lmsCourses (has a tenantId) or already seen
        if (d.tenantId) return;
        if (seenIds.has(d.id || doc.id)) return;
        if (seenNames.has((d.name || '').toLowerCase())) return;

        const mapped: ICourse = {
          id:          d.id || doc.id,
          tenantId,                                   // assign caller's tenantId for LMS compatibility
          name:        d.name || d.title || '',
          description: d.description || '',
          price:       d.price ?? d.fee ?? 0,
          visibility:  d.visibility || 'restricted',
          isDeleted:   false,
          deletedAt:   null,
          deletedBy:   null,
          createdAt:   d.createdAt ? (typeof d.createdAt.toDate === 'function' ? d.createdAt.toDate().toISOString() : String(d.createdAt)) : new Date().toISOString(),
          updatedAt:   d.updatedAt ? (typeof d.updatedAt.toDate === 'function' ? d.updatedAt.toDate().toISOString() : String(d.updatedAt)) : new Date().toISOString(),
          createdBy:   d.createdBy || 'system',
          updatedBy:   d.updatedBy || 'system',
        };

        seenIds.add(mapped.id as string);
        seenNames.add(mapped.name.toLowerCase());
        crmCourses.push(mapped);
      });
    } catch (_crmErr) {
      // Non-fatal: if CRM query fails, we still return LMS-native courses
    }

    // ── SOURCE 3: ERP batch `course` plain-text strings ───────────────────────
    // ERP batches store course as a plain string e.g. { course: "UDC" }.
    // We surface these as virtual ICourse entries so they appear in LMS dropdowns.
    let erpCourses: ICourse[] = [];
    try {
      const batchSnapshot = await db.collection('batches')
        .where('isDeleted', '==', false)
        .get();

      batchSnapshot.docs.forEach((doc: any) => {
        const d = doc.data() as any;
        const rawName: string = (d.course || '').trim();
        if (!rawName) return;
        if (seenNames.has(rawName.toLowerCase())) return; // already have it

        // Use a deterministic virtual ID so it stays stable across calls
        const virtualId = `erp_course_${rawName.toLowerCase().replace(/\s+/g, '_')}`;
        if (seenIds.has(virtualId)) return;

        const virtual: ICourse = {
          id:          virtualId,
          tenantId,
          name:        rawName,
          description: `Course synced from ERP batch (${rawName})`,
          price:       0,
          visibility:  'restricted',
          isDeleted:   false,
          deletedAt:   null,
          deletedBy:   null,
          createdAt:   new Date().toISOString(),
          updatedAt:   new Date().toISOString(),
          createdBy:   'erp_sync',
          updatedBy:   'erp_sync',
        };

        seenIds.add(virtualId);
        seenNames.add(rawName.toLowerCase());
        erpCourses.push(virtual);
      });
    } catch (_erpErr) {
      // Non-fatal: if batch query fails, we still return what we have
    }

    // ── Merge all three sources ───────────────────────────────────────────────
    return [...lmsCourses, ...crmCourses, ...erpCourses];
  }

  async findByNameAndTenant(name: string, tenantId: string): Promise<ICourse[]> {
    const snapshot = await this.collection
      .where('tenantId', '==', tenantId)
      .where('name', '==', name)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as ICourse);
  }
}

export class SubjectRepository extends BaseRepository {
  private collection = db.collection(LMS_COLLECTIONS.SUBJECTS);

  async create(data: Omit<ISubject, keyof BaseAuditFields>, userId: string): Promise<ISubject> {
    const docRef = this.collection.doc();
    const payload: ISubject = {
      ...data,
      ...this.generateAuditFields(userId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<ISubject>, userId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(userId),
    };
    await this.collection.doc(id).update(payload);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  async findById(id: string): Promise<ISubject | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as ISubject;
    if (data.isDeleted) return null;
    return data;
  }

  async findByCourseId(courseId: string): Promise<ISubject[]> {
    const snapshot = await this.collection
      .where('courseId', '==', courseId)
      .where('isDeleted', '==', false)
      .get();
    const subjects = snapshot.docs.map((doc: any) => doc.data() as ISubject);
    return subjects.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async findByNameAndCourse(name: string, courseId: string): Promise<ISubject[]> {
    const snapshot = await this.collection
      .where('courseId', '==', courseId)
      .where('name', '==', name)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as ISubject);
  }
}

export class TopicRepository extends BaseRepository {
  private collection = db.collection(LMS_COLLECTIONS.TOPICS);

  async create(data: Omit<ITopic, keyof BaseAuditFields>, userId: string): Promise<ITopic> {
    const docRef = this.collection.doc();
    const payload: ITopic = {
      ...data,
      ...this.generateAuditFields(userId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<ITopic>, userId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(userId),
    };
    await this.collection.doc(id).update(payload);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  async findById(id: string): Promise<ITopic | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as ITopic;
    if (data.isDeleted) return null;
    return data;
  }

  async findBySubjectId(subjectId: string): Promise<ITopic[]> {
    const snapshot = await this.collection
      .where('subjectId', '==', subjectId)
      .where('isDeleted', '==', false)
      .get();
    const topics = snapshot.docs.map((doc: any) => doc.data() as ITopic);
    return topics.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async findByNameAndSubject(name: string, subjectId: string): Promise<ITopic[]> {
    const snapshot = await this.collection
      .where('subjectId', '==', subjectId)
      .where('name', '==', name)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as ITopic);
  }
}

export class ClassRepository extends BaseRepository {
  private collection = db.collection(LMS_COLLECTIONS.CLASSES);

  async create(data: Omit<IClass, keyof BaseAuditFields>, userId: string): Promise<IClass> {
    const docRef = this.collection.doc();
    const payload: IClass = {
      ...data,
      ...this.generateAuditFields(userId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<IClass>, userId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(userId),
    };
    await this.collection.doc(id).update(payload);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  async findById(id: string): Promise<IClass | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as IClass;
    if (data.isDeleted) return null;
    return data;
  }

  async findByTopicId(topicId: string): Promise<IClass[]> {
    const snapshot = await this.collection
      .where('topicId', '==', topicId)
      .where('isDeleted', '==', false)
      .get();
    const classes = snapshot.docs.map((doc: any) => doc.data() as IClass);
    return classes.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async findByTitleAndTopic(title: string, topicId: string): Promise<IClass[]> {
    const snapshot = await this.collection
      .where('topicId', '==', topicId)
      .where('title', '==', title)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as IClass);
  }

  async findBySubtopicId(subtopicId: string): Promise<IClass[]> {
    const snapshot = await this.collection
      .where('subtopicId', '==', subtopicId)
      .where('isDeleted', '==', false)
      .get();
    const classes = snapshot.docs.map((doc: any) => doc.data() as IClass);
    return classes.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
}

export class SubtopicRepository extends BaseRepository {
  private collection = db.collection(LMS_COLLECTIONS.SUBTOPICS);

  async create(data: Omit<ISubtopic, keyof BaseAuditFields>, userId: string): Promise<ISubtopic> {
    const docRef = this.collection.doc();
    const payload: ISubtopic = {
      ...data,
      ...this.generateAuditFields(userId),
      id: docRef.id,
    };
    await docRef.set(payload);
    return payload;
  }

  async update(id: string, data: Partial<ISubtopic>, userId: string): Promise<void> {
    const payload = {
      ...data,
      ...this.generateUpdateAuditFields(userId),
    };
    await this.collection.doc(id).update(payload);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.collection.doc(id).update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  async findById(id: string): Promise<ISubtopic | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as ISubtopic;
    if (data.isDeleted) return null;
    return data;
  }

  async findByTopicId(topicId: string): Promise<ISubtopic[]> {
    const snapshot = await this.collection
      .where('topicId', '==', topicId)
      .where('isDeleted', '==', false)
      .get();
    const subtopics = snapshot.docs.map((doc: any) => doc.data() as ISubtopic);
    return subtopics.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async findByNameAndTopic(name: string, topicId: string): Promise<ISubtopic[]> {
    const snapshot = await this.collection
      .where('topicId', '==', topicId)
      .where('name', '==', name)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as ISubtopic);
  }

  async findAll(tenantId: string): Promise<ISubtopic[]> {
    // Note: since subtopics belong to topics, and topics belong to subjects (linked to course/tenantId),
    // we query all subtopics and filter or retrieve all. Since subtopics collection is relatively small,
    // we retrieve all non-deleted subtopics. Or we can list them. Let's do a simple get.
    const snapshot = await this.collection
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map((doc: any) => doc.data() as ISubtopic);
  }
}
