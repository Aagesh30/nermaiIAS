import React from 'react';
import { cn } from '../../core/utils/cn';

export interface TopbarProps extends React.HTMLAttributes<HTMLElement> {
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function Topbar({ leftContent, centerContent, rightContent, className, ...props }: TopbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border border-t-2 border-t-primary bg-surface px-6 shadow-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">{leftContent}</div>
      <div className="flex flex-1 items-center justify-center px-4">{centerContent}</div>
      <div className="flex items-center gap-4">{rightContent}</div>
    </header>
  );
}
