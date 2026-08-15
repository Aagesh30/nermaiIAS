import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LiveSessionApi } from '@nermai/api';

/**
 * StaffLiveClassRedirect
 *
 * Route: /staff/live/class/:classId
 *
 * Allows staff to navigate to a live session using only the classId (which
 * they always have from the LMS). This component calls the backend join
 * endpoint, obtains the live sessionId, and redirects to the full
 * TeacherConsole at /staff/live/:sessionId.
 *
 * This eliminates the UX mismatch where the web staff portal required knowing
 * the sessionId upfront, whereas the mobile flow only needs the classId.
 */
export const StaffLiveClassRedirect: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) {
      setError('No class ID provided.');
      return;
    }

    const resolve = async () => {
      try {
        const res = await LiveSessionApi.joinByClass(classId);
        const data = res.data?.data;
        const sessionId = data?.sessionId || data?.id;
        if (sessionId) {
          navigate(`/staff/live/${sessionId}`, { replace: true });
        } else {
          setError('No active live session found for this class.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to resolve live session for this class.');
      }
    };

    resolve();
  }, [classId, navigate]);

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate('/staff/live')}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
        >
          ← Back to Sessions
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Connecting to live class...</p>
      </div>
    </div>
  );
};
