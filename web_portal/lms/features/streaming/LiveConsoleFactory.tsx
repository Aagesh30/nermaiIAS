import React from 'react';
import { StudentLiveScreen } from './StudentLiveScreen';
import { TeacherLiveScreen } from './TeacherLiveScreen';
import { AdminLiveScreen } from './AdminLiveScreen';
import { View, Text } from 'react-native';
import { registerMobileWorkspaces } from '../../components/live/MobileWorkspaces';

registerMobileWorkspaces();

interface LiveConsoleFactoryProps {
  role: string;
  provider: string;
  payload: any;
}

export const LiveConsoleFactory: React.FC<LiveConsoleFactoryProps> = ({ role, provider, payload }) => {
  if (role === 'student') {
    return <StudentLiveScreen provider={provider} payload={payload} />;
  }
  
  if (role === 'teacher' || role === 'staff') {
    return <TeacherLiveScreen provider={provider} payload={payload} />;
  }

  if (role === 'admin' || role === 'super_admin') {
    return <AdminLiveScreen provider={provider} payload={payload} />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#FF6B6B' }}>Unsupported Role for Live Session</Text>
    </View>
  );
};
