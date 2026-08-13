import { db } from '../../../infrastructure/firebase';
import { IZoomHost } from '../types';
import { AppError } from '../../../core/errors/AppError';

export class ZoomHostService {
  private static collection = 'zoom_hosts';

  /**
   * Finds an available Zoom host and marks it as busy.
   */
  static async acquireAvailableHost(sessionId: string): Promise<IZoomHost> {
    const snapshot = await db.collection(this.collection)
      .where('isActive', '==', true)
      .where('status', '==', 'available')
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new AppError('No Zoom host accounts are currently available.', 503);
    }

    const hostDoc = snapshot.docs[0];
    const host = { id: hostDoc.id, ...hostDoc.data() } as IZoomHost;

    // Transaction to safely reserve
    await db.runTransaction(async (t) => {
      const doc = await t.get(hostDoc.ref);
      if (doc.data()?.status !== 'available') {
        throw new AppError('Host was taken concurrently.', 503);
      }
      t.update(hostDoc.ref, {
        status: 'busy',
        currentMeetingId: sessionId,
        lastUsedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    return host;
  }

  /**
   * Releases a host back into the available pool.
   */
  static async releaseHost(hostId: string): Promise<void> {
    if (!hostId) return;
    await db.collection(this.collection).doc(hostId).update({
      status: 'available',
      currentMeetingId: null,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Fallback for MVP: Create the default host if it doesn't exist
   */
  static async seedDefaultHostIfNeeded(): Promise<void> {
    const snapshot = await db.collection(this.collection).limit(1).get();
    if (snapshot.empty) {
      await db.collection(this.collection).add({
        email: 'default@nermai.com',
        zoomUserId: 'me',
        status: 'available',
        isActive: true,
        currentSessions: 0,
        maxConcurrentSessions: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
}
