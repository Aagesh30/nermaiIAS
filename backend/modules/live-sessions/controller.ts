import { Request, Response } from 'express';
import { LiveSessionService } from './service';
import { logger } from '../../core/logger';
import { AppError } from '../../core/errors/AppError';

export class LiveSessionController {
  static async listSessions(req: Request, res: Response) {
    try {
      const filters = req.query;
      const { role, userId, tenantId } = req.user!;
      
      if (role === 'student') {
        const sessions = await LiveSessionService.getStudentLiveSessions(userId, tenantId);
        return res.status(200).json({ success: true, data: sessions });
      }

      const sessions = await LiveSessionService.listSessions(filters);
      res.status(200).json({ success: true, data: sessions });
    } catch (error: any) {
      logger.error('Error listing live sessions:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async createSession(req: Request, res: Response) {
    try {
      const { 
        classId, provider, customProviderId, providerPasscode, scheduledStartTime, expectedDurationMinutes,
        providerAccountId, meetingMode, hostUrl, participantUrl, hostKey, meetingCode 
      } = req.body;
      const teacherId = req.user?.userId;

      if (!classId || !provider) {
        throw new AppError('classId and provider are required', 400);
      }

      const session = await LiveSessionService.createSession({ 
        classId, provider, teacherId, customProviderId, providerPasscode,
        providerAccountId, meetingMode, hostUrl, participantUrl, hostKey, meetingCode 
      });
      
      // If we are passing scheduling info on create, we can update it immediately
      if (scheduledStartTime) {
        await LiveSessionService.editSession(session.id!, { scheduledStartTime, expectedDurationMinutes }, teacherId || 'system');
      }

      res.status(201).json({ success: true, data: session });
    } catch (error: any) {
      logger.error('Error creating live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async editSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const updates = req.body;
      const result = await LiveSessionService.editSession(sessionId, updates, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error editing live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async rescheduleSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const { newStartTime } = req.body;
      if (!newStartTime) throw new AppError('newStartTime is required', 400);
      const result = await LiveSessionService.rescheduleSession(sessionId, newStartTime, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error rescheduling live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async cancelSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const result = await LiveSessionService.cancelSession(sessionId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error cancelling live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async deleteSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const result = await LiveSessionService.deleteSession(sessionId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error deleting live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async duplicateSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const result = await LiveSessionService.duplicateSession(sessionId, adminId);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error duplicating live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async archiveSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const adminId = req.user?.userId || 'system';
      const result = await LiveSessionService.archiveSession(sessionId, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error archiving live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async startSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const result = await LiveSessionService.startSession(sessionId, req.user);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error starting live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async extendSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { minutes, reason } = req.body;
      const adminId = req.user?.userId;
      if (!minutes) throw new AppError('Minutes to extend are required', 400);

      const result = await LiveSessionService.extendSession(sessionId, minutes, reason, adminId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error extending live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async endSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      await LiveSessionService.endSession(sessionId, req.user);
      res.status(200).json({ success: true, message: 'Session ended successfully' });
    } catch (error: any) {
      logger.error('Error ending live session:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async startAttendance(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const result = await LiveSessionService.startAttendance(sessionId, req.user);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error starting attendance:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async endAttendance(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const result = await LiveSessionService.endAttendance(sessionId, req.user);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error ending attendance:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async heartbeat(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const teacherId = req.user?.userId || 'system';
      const result = await LiveSessionService.handleHeartbeat(sessionId, teacherId);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error on heartbeat:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async joinSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const payload = await LiveSessionService.getJoinPayload(sessionId, req.user);
      res.status(200).json({ success: true, data: payload });
    } catch (error: any) {
      logger.error('Error joining live session by ID:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async getSessionState(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      
      const ifNoneMatch = req.headers['if-none-match'];
      const payload = await LiveSessionService.getSessionState(sessionId, req.user);
      
      const currentEtag = `W/"${payload.version}"`;
      res.setHeader('ETag', currentEtag);
      
      if (ifNoneMatch === currentEtag) {
        return res.status(304).end();
      }

      res.status(200).json({ success: true, data: payload });
    } catch (error: any) {
      logger.error('Error getting session state:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async assignStaff(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { targetUserId } = req.body;
      if (!targetUserId) throw new AppError('targetUserId is required', 400);
      const result = await LiveSessionService.assignStaff(sessionId, targetUserId, req.user);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error assigning staff:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async removeStaff(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { targetUserId } = req.body;
      if (!targetUserId) throw new AppError('targetUserId is required', 400);
      const result = await LiveSessionService.removeStaff(sessionId, targetUserId, req.user);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error('Error removing staff:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async joinClass(req: Request, res: Response) {
    try {
      const classId = req.params.classId as string;
      const result = await LiveSessionService.joinLiveClass(classId, req.user);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error joining live class:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async handleSdkEvent(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { event, connectionState, role, displayName, providerParticipantId, isRemote } = req.body;
      const user = req.user;
      
      const { ParticipantService } = require('./participantService');
      
      // If it's a remote event (user-added/user-removed sent by host), we might not have a reliable userId.
      // So we use the providerParticipantId to update their status.
      // If it's a local event (the user's own connection-change), we use req.user.userId.
      const targetUserId = isRemote ? null : user?.userId;
      const targetName = isRemote ? displayName : ((user as any)?.name || displayName);

      switch (event) {
        case 'HostConnected':
        case 'ParticipantJoined':
          await ParticipantService.updateParticipantStatus(
            sessionId, targetUserId, 'JOINED', providerParticipantId, 'CONNECTED', role, targetName
          );
          if (event === 'HostConnected') {
            await LiveSessionService.markHostConnected(sessionId);
          }
          break;
          
        case 'ConnectionLost':
          await ParticipantService.updateParticipantStatus(
            sessionId, targetUserId, 'RECONNECTING', providerParticipantId, 'RECONNECTING', role, targetName
          );
          break;

        case 'HostDisconnected':
        case 'ParticipantLeft':
          await ParticipantService.updateParticipantStatus(
            sessionId, targetUserId, 'LEFT', providerParticipantId, 'DISCONNECTED', role, targetName
          );
          // We do not auto-end the meeting if the host disconnects, they might just be reconnecting.
          break;

        case 'MeetingEnded':
          await LiveSessionService.endSession(sessionId);
          break;
      }
      
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error handling SDK event:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  // ── Participant & Moderation Endpoints ────────────────────────────────────

  static async listParticipants(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { ParticipantService } = require('./participantService');
      const participants = await ParticipantService.listParticipants(sessionId);
      res.status(200).json({ success: true, data: participants });
    } catch (error: any) {
      logger.error('Error listing participants:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async patchParticipant(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const studentId = req.params.studentId as string;
      const { action, kickReasonCode, kickCustomMessage } = req.body;
      const actorId = req.user?.userId || 'system';

      const { ParticipantService } = require('./participantService');
      const updated = await ParticipantService.patchParticipantAction(sessionId, studentId, action, actorId, {
        kickReasonCode,
        kickCustomMessage,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      logger.error('Error updating participant action:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async studentHeartbeat(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const studentId = req.user?.userId || 'student';

      const { ParticipantService } = require('./participantService');
      await ParticipantService.updateHeartbeat(sessionId, studentId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error updating student heartbeat:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async blockStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId as string;
      const { reason, displayName } = req.body;
      const actorId = req.user?.userId || 'system';

      const { ParticipantService } = require('./participantService');
      const block = await ParticipantService.blockStudent(studentId, actorId, reason, displayName);
      res.status(200).json({ success: true, data: block });
    } catch (error: any) {
      logger.error('Error blocking student globally:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async unblockStudent(req: Request, res: Response) {
    try {
      const studentId = req.params.studentId as string;
      const actorId = req.user?.userId || 'system';

      const { ParticipantService } = require('./participantService');
      await ParticipantService.unblockStudent(studentId, actorId);
      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error('Error unblocking student globally:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async listGlobalBlocks(req: Request, res: Response) {
    try {
      const { ParticipantService } = require('./participantService');
      const blocks = await ParticipantService.listGlobalBlocks();
      res.status(200).json({ success: true, data: blocks });
    } catch (error: any) {
      logger.error('Error listing global blocks:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async generateJoinToken(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const token = await LiveSessionService.generateJoinToken(sessionId, req.user);
      res.status(200).json({ success: true, token });
    } catch (error: any) {
      logger.error('Error generating join token:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async validateJoinToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      if (!token) throw new AppError('Token is required', 400);
      
      const payload = await LiveSessionService.validateJoinToken(token as string);
      
      // Audit log the token consumption
      logger.info(`[Zoom SDK] Token consumed successfully. IP: ${req.ip} | Session: ${payload.meetingId} | Role: ${payload.participantRole}`);
      
      res.status(200).json({ success: true, data: payload });
    } catch (error: any) {
      logger.error('Error validating join token:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async getCapabilities(req: Request, res: Response) {
    try {
      const { ProviderManager } = require('./providers/ProviderManager');
      const capabilities = ProviderManager.getAllCapabilities();
      res.status(200).json({ success: true, data: capabilities });
    } catch (error: any) {
      logger.error('Error getting provider capabilities:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }

  static async getZoomDiagnostics(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const { LiveSessionService } = require('./service');
      const { ProviderManager } = require('./providers/ProviderManager');
      const session = await LiveSessionService.getSession(sessionId);
      if (!session) throw new AppError('Live session not found', 404);

      if (session.provider !== 'zoom') {
        throw new AppError('Diagnostics only available for Zoom sessions', 400);
      }

      const providerInstance = ProviderManager.getProvider('zoom');
      
      let diagnostics = {
        sessionId: session.id,
        providerSessionId: session.providerSessionId,
        hostId: session.hostId,
        providerAccountId: session.providerAccountId,
        localStatus: session.status,
        providerResult: null as any
      };

      if (providerInstance.getDiagnostics && session.providerSessionId) {
        diagnostics.providerResult = await providerInstance.getDiagnostics(session);
      } else if (providerInstance.verifySession && session.providerSessionId) {
        diagnostics.providerResult = await providerInstance.verifySession(session);
      } else {
        diagnostics.providerResult = { meetingExists: false, reason: 'NO_MEETING_ID' };
      }

      res.status(200).json({ success: true, data: diagnostics });
    } catch (error: any) {
      logger.error('Error getting zoom diagnostics:', error);
      res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Server error' });
    }
  }
}
