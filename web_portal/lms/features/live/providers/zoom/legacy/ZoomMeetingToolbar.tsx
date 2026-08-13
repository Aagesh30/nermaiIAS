import React from 'react';

export const ZoomMeetingToolbar: React.FC = () => {
  // Zoom provides its own native toolbar via the Component View SDK.
  // Returning null allows the native UI to handle Start Meeting, Mute All, and Leave.
  return null;
};
