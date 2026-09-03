import { db } from '../../infrastructure/firebase';

export const WATCH_HISTORY_COLLECTION = 'watch_history';

export class WatchHistoryRepository {
  private collection = db.collection(WATCH_HISTORY_COLLECTION);

  async upsert(studentId: string, classId: string, data: any): Promise<void> {
    // Watch history tracking disabled to eliminate database operations
    return;
  }

  async getProgress(studentId: string, classId: string): Promise<any | null> {
    // Watch history tracking disabled to eliminate database operations
    return null;
  }
}
