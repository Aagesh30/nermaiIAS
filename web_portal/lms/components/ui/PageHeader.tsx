import React from 'react';
import { cn } from '../../core/utils/cn';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, className, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8', className)}
        {...props}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
          {description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    );
  }
);
PageHeader.displayName = 'PageHeader';
