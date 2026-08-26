import { Request, Response, NextFunction } from 'express';
import { db } from '../../../infrastructure/firebase';
import { logger } from '../../../core/logger';

const COLLECTION = 'device_alerts';

// ─── LIST DEVICE ALERTS ───────────────────────────────────────────────────────
export const listDeviceAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 200);
    const onlyUnacknowledged = req.query.unacknowledged === 'true';

    let query: FirebaseFirestore.Query = db.collection(COLLECTION)
      .orderBy('alertTime', 'desc')
      .limit(limit);

    if (onlyUnacknowledged) {
      query = db.collection(COLLECTION)
        .where('acknowledged', '==', false)
        .orderBy('alertTime', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();

    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ status: 'success', data: alerts });
  } catch (err: any) {
    logger.error('[DeviceAlerts] listDeviceAlerts error:', err);
    next(err);
  }
};

// ─── ACKNOWLEDGE ALERT ────────────────────────────────────────────────────────
export const acknowledgeAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ status: 'error', message: 'Alert ID required' });

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Alert not found' });

    await docRef.update({
      acknowledged: true,
      acknowledgedBy: req.user?.userId || 'unknown',
      acknowledgedByName: (req.user as any)?.name || (req.user as any)?.username || 'Admin',
      acknowledgedAt: new Date().toISOString(),
    });

    return res.status(200).json({ status: 'success', message: 'Alert acknowledged' });
  } catch (err: any) {
    logger.error('[DeviceAlerts] acknowledgeAlert error:', err);
    next(err);
  }
};

// ─── DELETE ALERT ─────────────────────────────────────────────────────────────
export const deleteAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ status: 'error', message: 'Alert ID required' });

    const docRef = db.collection(COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Alert not found' });

    await docRef.delete();
    return res.status(200).json({ status: 'success', message: 'Alert deleted' });
  } catch (err: any) {
    logger.error('[DeviceAlerts] deleteAlert error:', err);
    next(err);
  }
};

// ─── GET UNACKNOWLEDGED COUNT ─────────────────────────────────────────────────
export const getUnacknowledgedCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await db.collection(COLLECTION)
      .where('acknowledged', '==', false)
      .get();

    return res.status(200).json({ status: 'success', data: { count: snapshot.size } });
  } catch (err: any) {
    logger.error('[DeviceAlerts] getUnacknowledgedCount error:', err);
    next(err);
  }
};
