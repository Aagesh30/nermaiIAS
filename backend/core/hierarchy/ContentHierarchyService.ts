import { db } from '../../infrastructure/firebase';
import { EntityType } from '../sape/types';
import { AppError } from '../errors/AppError';

interface HierarchyNode {
  type: EntityType;
  id: string;
}

export class ContentHierarchyService {
  
  /**
   * Fetches all parents recursively (e.g. Class -> Topic -> Subject -> Course).
   * Used by effective_access_cache resolution.
   */
  async getParents(entityType: EntityType, entityId: string): Promise<HierarchyNode[]> {
    const parents: HierarchyNode[] = [];
    let currentType = entityType;
    let currentId = entityId;

    while (true) {
      if (currentType === 'CLASS') {
        const cls = await db.collection('classes').doc(currentId).get();
        if (!cls.exists) break;
        const topicId = cls.data()?.topicId;
        if (!topicId) break;
        parents.push({ type: 'TOPIC', id: topicId });
        currentType = 'TOPIC';
        currentId = topicId;
      } 
      else if (currentType === 'TOPIC') {
        const topic = await db.collection('topics').doc(currentId).get();
        if (!topic.exists) break;
        const subjectId = topic.data()?.subjectId;
        if (!subjectId) break;
        parents.push({ type: 'SUBJECT', id: subjectId });
        currentType = 'SUBJECT';
        currentId = subjectId;
      } 
      else if (currentType === 'SUBJECT') {
        const subject = await db.collection('subjects').doc(currentId).get();
        if (!subject.exists) break;
        const courseId = subject.data()?.courseId;
        if (!courseId) break;
        parents.push({ type: 'COURSE', id: courseId });
        currentType = 'COURSE';
        currentId = courseId;
      } 
      else {
        // Reached top level (COURSE) or unsupported type
        break;
      }
    }
    
    return parents;
  }

  /**
   * Expands any scope (Course/Subject/Topic) into its child Classes.
   */
  async expandScopeToClasses(entityType: EntityType, entityId: string): Promise<FirebaseFirestore.DocumentData[]> {
    const classes: FirebaseFirestore.DocumentData[] = [];

    if (entityType === 'CLASS') {
      const cls = await db.collection('classes').doc(entityId).get();
      if (cls.exists) classes.push({ id: cls.id, ...cls.data() });
      return classes;
    }

    if (entityType === 'TOPIC') {
      const snap = await db.collection('classes').where('topicId', '==', entityId).get();
      snap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
      return classes;
    }

    if (entityType === 'SUBJECT') {
      const topicsSnap = await db.collection('topics').where('subjectId', '==', entityId).get();
      const topicIds = topicsSnap.docs.map(d => d.id);
      
      // Batch 'in' queries (max 10 elements per query for firestore, so we'll do sequentially or batched)
      for (const tId of topicIds) {
        const snap = await db.collection('classes').where('topicId', '==', tId).get();
        snap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
      }
      return classes;
    }

    if (entityType === 'COURSE') {
      const subjectsSnap = await db.collection('subjects').where('courseId', '==', entityId).get();
      const subjectIds = subjectsSnap.docs.map(d => d.id);
      
      for (const sId of subjectIds) {
        const topicsSnap = await db.collection('topics').where('subjectId', '==', sId).get();
        const topicIds = topicsSnap.docs.map(d => d.id);
        
        for (const tId of topicIds) {
          const snap = await db.collection('classes').where('topicId', '==', tId).get();
          snap.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
        }
      }
      return classes;
    }

    return classes;
  }

  /**
   * Analyzes an entity and returns how many resources of each type it contains,
   * plus the total Recorded Units it consumes.
   */
  async calculateScopeCost(entityType: EntityType, entityId: string) {
    const classes = await this.expandScopeToClasses(entityType, entityId);
    
    let recordedClasses = 0;
    let liveClasses = 0;
    
    for (const cls of classes) {
      if (cls.classType === 'youtube_recorded') {
        recordedClasses++;
      } else if (cls.classType === 'youtube_live' || cls.classType === 'zoom_live') {
        liveClasses++;
      }
    }

    // Currently notes/tests are not linked directly in this schema to the topic tree in the same way,
    // but hooks could be added here in the future.
    
    return {
      type: entityType,
      recordedClasses,
      liveClasses,
      notes: 0,
      tests: 0,
      units: recordedClasses // Only recorded classes consume units
    };
  }

}
