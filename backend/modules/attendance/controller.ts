import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { attendanceService } from './service';

const eventSchema = z.object({
  classId: z.string(),
  event: z.enum(['JOIN', 'PLAY', 'PAUSE', 'SEEK', 'HEARTBEAT', 'BACKGROUND', 'FOREGROUND', 'LEAVE', 'ENDED', 'COMPLETE']),
  position: z.number().optional(),
  timestamp: z.string().optional(), // Client timestamp for debugging only
  provider: z.enum(['youtube_recorded', 'youtube_live', 'zoom_live', 'recorded']),
  requestId: z.string().optional()
});

export const processEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedData = eventSchema.parse(req.body);
    const requestId = parsedData.requestId || `att-sys-${Date.now()}`;
    console.log(`[Attendance API] [${requestId}] Received`, req.method, req.url, req.body);
    console.log(`[Attendance API] [${requestId}] Validated`);

    const { userId } = req.user!;
    const sessionId = (req as any).sessionId || 'legacy_session';

    await attendanceService.processEvent(
      userId,
      parsedData.classId,
      parsedData.event,
      sessionId,
      parsedData.provider,
      requestId
    );
    
    console.log(`[Attendance API] [${requestId}] Response Sent (200 OK)`);
    res.status(200).json({ status: 'success', message: 'Event processed' });
  } catch (error) { 
    console.error(`[Attendance API] Error processing event:`, error);
    next(error); 
  }
};

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = req.params.classId;
    const { userId } = req.user!;
    
    // Fetch directly from firestore or redis
    // In production, might want to check Redis first for live session activeTimeSeconds
    const { db } = require('../../infrastructure/firebase');
    const docRef = db.collection('attendance_sessions').doc(`${classId}_${userId}`);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(200).json({
        status: 'success',
        data: {
          status: 'NOT_STARTED',
          activeTimeSeconds: 0,
          percentage: 0,
          requiredSeconds: 0
        }
      });
    }
    
    const data = docSnap.data();
    let requiredSeconds = 0;
    
    // Attempt to calculate required seconds
    const classDocSnap = await db.collection('classes').doc(classId).get();
    if (classDocSnap.exists) {
       const classDoc = classDocSnap.data();
       if (classDoc.attendance) {
          const expectedDurationSeconds = (classDoc.expectedDurationMinutes || 60) * 60;
          const policy = classDoc.attendance;
          switch (policy.mode) {
            case 'percentage': requiredSeconds = expectedDurationSeconds * (policy.value / 100); break;
            case 'fixed_minutes': requiredSeconds = policy.value * 60; break;
            case 'full': requiredSeconds = expectedDurationSeconds; break;
            default: requiredSeconds = expectedDurationSeconds;
          }
       }
    }
    
    // Check redis for active session buffered time
    const { redisClient } = require('../../infrastructure/redis');
    const sessionId = (req as any).sessionId || 'legacy_session';
    const redisKey = `attendance:${classId}:${userId}:${sessionId}`;
    const cached = await redisClient.get(redisKey);
    let currentActiveTime = data.activeTimeSeconds || 0;
    if (cached) {
      const session = JSON.parse(cached);
      currentActiveTime = session.activeTimeSeconds || currentActiveTime;
    }
    
    const remainingSeconds = Math.max(0, requiredSeconds - currentActiveTime);
    const percentage = requiredSeconds > 0 ? (currentActiveTime / requiredSeconds) * 100 : 0;
    
    res.status(200).json({
      status: 'success',
      data: {
        status: data.status || 'IN_PROGRESS',
        activeTimeSeconds: currentActiveTime,
        requiredSeconds,
        remainingSeconds,
        percentage: Math.min(100, percentage),
        finalResult: data.finalResult
      }
    });
  } catch (error) {
    console.error(`[Attendance API] Error fetching status:`, error);
    next(error);
  }
};
