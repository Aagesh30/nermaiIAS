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
    
    // Platform Super Admin, Admin and Developer retain global override permissions
    if (user.role === 'super_admin' || user.role === 'developer' || user.role === 'admin') {
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

    // Fetch session and class documents
    let session = sessionData;
    if (!session) {
      const sessionSnap = await db.collection('live_sessions').doc(sessionId).get();
      if (!sessionSnap.exists) return false;
      session = { id: sessionSnap.id, ...sessionSnap.data() } as ILiveSession;
    }

    const classSnap = await db.collection('classes').doc(session.classId).get();
    const cls = classSnap.exists ? classSnap.data()! : {};

    // 1. Host or Creator Check
    const hostUserId = session.host?.userId || session.hostId || cls.teacherId || cls.hostId;
    const isHost = hostUserId === userId;
    const isCreator = cls.createdBy === userId;

    // 2. Participant checks
    const participantAdminIds = session.participantAdminIds || cls.participantAdminIds || [];
    const participantTeacherIds = session.participantTeacherIds || cls.participantTeacherIds || [];
    const assignedStaffIds = session.assignedStaffIds || [];

    const isAssignedAdmin = participantAdminIds.includes(userId);
    const isAssignedTeacher = participantTeacherIds.includes(userId) || assignedStaffIds.includes(userId);

    const hasAccess = isHost || isCreator || isAssignedAdmin || isAssignedTeacher;

    if (hasAccess) {
      switch (capability) {
        case 'JOIN_SESSION':
        case 'START_SESSION':
        case 'START_ATTENDANCE':
        case 'END_ATTENDANCE':
        case 'END_SESSION':
        case 'KICK_PARTICIPANT':
          return true; // Authorized staff/hosts can moderate/join
        case 'ASSIGN_STAFF':
          return isHost || ['admin'].includes(user.role); // Only host or admins can assign staff
        default:
          return false;
      }
    }

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
