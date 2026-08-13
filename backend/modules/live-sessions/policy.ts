import { AppError } from '../../core/errors/AppError';
import { db } from '../../infrastructure/firebase';
import { ILiveSession } from './types';

export type LiveSessionCapability = 
  | 'START_SESSION'
  | 'JOIN_SESSION'
  | 'START_ATTENDANCE'
  | 'END_ATTENDANCE'
  | 'END_SESSION'
  | 'KICK_PARTICIPANT'
  | 'ASSIGN_STAFF';

export class LiveSessionPolicy {
  /**
   * Determine if the user has the specified capability for the given session.
   * Fetches session from Firestore if not provided.
   */
  static async can(
    sessionId: string, 
    user: { userId?: string, id?: string, role: string }, 
    capability: LiveSessionCapability, 
    sessionData?: ILiveSession
  ): Promise<boolean> {
    if (!user) return false;
    
    // Normalize userId
    const userId = user.userId || user.id;
    if (!userId) return false;
    
    // Platform Admins retain override permissions regardless of staff assignments
    if (['super_admin', 'admin'].includes(user.role)) {
      return true; 
    }

    // Students have limited baseline capabilities
    if (user.role === 'student') {
      if (capability === 'JOIN_SESSION') {
        // Students can only join if the state is evaluated as LIVE or JOINING
        // Note: state validation is further enforced by the caller (LiveSessionService)
        return true; 
      }
      return false;
    }

    // Unassigned Staff or Management - must check assignments
    let session = sessionData;
    if (!session) {
      const sessionSnap = await db.collection('live_sessions').doc(sessionId).get();
      if (!sessionSnap.exists) return false;
      session = sessionSnap.data() as ILiveSession;
    }

    // Check if the user is in the assignedStaffIds array
    const isAssigned = session.assignedStaffIds?.includes(userId) || false;

    if (isAssigned) {
      switch (capability) {
        case 'JOIN_SESSION':
        case 'START_SESSION':
        case 'START_ATTENDANCE':
        case 'END_ATTENDANCE':
        case 'END_SESSION':
        case 'KICK_PARTICIPANT':
          return true; // Assigned staff can moderate
        case 'ASSIGN_STAFF':
          return false; // Only admins can re-assign staff
        default:
          return false;
      }
    }

    // Unassigned staff
    return false;
  }

  /**
   * Utility to enforce a capability and throw if unauthorized.
   */
  static async enforce(
    sessionId: string, 
    user: any, 
    capability: LiveSessionCapability,
    sessionData?: ILiveSession
  ): Promise<void> {
    const isAuthorized = await this.can(sessionId, user, capability, sessionData);
    if (!isAuthorized) {
      throw new AppError(`You do not have permission to perform ${capability} on this live session.`, 403);
    }
  }
}
