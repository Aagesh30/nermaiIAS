import { useState } from 'react';
import { LiveSessionApi } from '../../../../core/services';

export function useLiveSessionModeration(sessionId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleParticipantAction = async (studentId: string, action: string, extraData?: any) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      await LiveSessionApi.patchParticipant(sessionId, studentId, { action, ...extraData });
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalBlock = async (studentId: string, displayName?: string, reason: string = 'Instructor moderation') => {
    try {
      setLoading(true);
      setError(null);
      await LiveSessionApi.blockStudent(studentId, { displayName, reason });
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalUnblock = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      await LiveSessionApi.unblockStudent(studentId);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    handleParticipantAction,
    handleGlobalBlock,
    handleGlobalUnblock,
    loading,
    error,
  };
}

