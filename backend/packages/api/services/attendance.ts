import { getApiClient } from '../client';

export interface AttendanceEventPayload {
  classId: string;
  event: 'JOIN' | 'PLAY' | 'PAUSE' | 'SEEK' | 'HEARTBEAT' | 'BACKGROUND' | 'FOREGROUND' | 'LEAVE' | 'ENDED' | 'COMPLETE';
  position?: number;
  provider: 'youtube_recorded' | 'youtube_live' | 'zoom_live' | 'recorded';
  timestamp?: string;
}

export const AttendanceApi = {
  sendAttendanceEvent: (payload: AttendanceEventPayload, playerJwt: string) => 
    getApiClient().post('/attendance/event', payload, {
      headers: {
        Authorization: `Bearer ${playerJwt}`
      }
    })
};
