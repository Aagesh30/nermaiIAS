import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './core/queryClient';
import { ToastProvider } from './components/ui/Toast/ToastContext';

/**
 * LMSProvider — wraps LMS components with React Query and Toast notifications.
 * Place this around any section of App.tsx that renders LMS pages.
 * 
 * It's safe to render this unconditionally — React Query's context 
 * only activates when components actually call useQuery/useMutation.
 */
export const LMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ToastProvider>
  );
};
