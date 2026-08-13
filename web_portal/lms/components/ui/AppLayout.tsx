import React from 'react';
import { cn } from '../../core/utils/cn';

export interface AppLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar?: React.ReactNode;
  topbar?: React.ReactNode;
}

export function AppLayout({ sidebar, topbar, children, className, ...props }: AppLayoutProps) {
  return (
    <div
      className={cn('flex h-screen flex-col overflow-hidden bg-background text-textPrimary font-sans', className)}
      {...props}
    >
      {topbar}
      <div className="flex flex-1 overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto relative">
          {/* Ambient subtle glow for enterprise depth */}
          <div className="pointer-events-none fixed top-20 right-[-100px] h-[500px] w-[500px] bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_70%)] z-0" />
          <div className="relative z-10 h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

