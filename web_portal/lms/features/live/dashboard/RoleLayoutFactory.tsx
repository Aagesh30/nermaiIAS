import React from 'react';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { AdminLayout } from './layouts/AdminLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentLayout } from './layouts/StudentLayout';

// Fallback for roles that don't have a specific layout yet (like staff)
const FallbackLayout: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-950 text-gray-400">
      <p>Layout for your role is not yet available.</p>
    </div>
  );
};

export const RoleLayoutFactory: React.FC = () => {
  const { role } = useLiveSessionContext();

  switch (role) {
    case 'super_admin':
    case 'admin':
      return <AdminLayout />;
    case 'teacher':
      return <TeacherLayout />;
    case 'student':
      return <StudentLayout />;
    default:
      return <FallbackLayout />;
  }
};

