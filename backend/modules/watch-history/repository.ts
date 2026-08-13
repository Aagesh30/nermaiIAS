import { db } from '../../infrastructure/firebase';

export const WATCH_HISTORY_COLLECTION = 'watch_history';

export class WatchHistoryRepository {
  private collection = db.collection(WATCH_HISTORY_COLLECTION);

  async upsert(studentId: string, classId: string, data: any): Promise<void> {
    const { position, completed, watchPercent } = data;

    const payload = {
      studentId,
      classId,
      position,
      watchPercent: watchPercent || 0,
      completed,
      updatedAt: new Date().toISOString(),
    };

    const query = await this.collection
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .limit(1)
      .get();

    if (query.empty) {
      await this.collection.add(payload);
    } else {
      await query.docs[0].ref.update(payload);
    }
  }

  async getProgress(studentId: string, classId: string): Promise<any | null> {
    const query = await this.collection
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .limit(1)
      .get();

    if (query.empty) return null;
    return query.docs[0].data();
  }
}
