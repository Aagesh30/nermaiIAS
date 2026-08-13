import React from 'react';
import { cn } from '../../core/utils/cn';

export function PageContainer({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto max-w-7xl p-6 md:p-8', className)} {...props}>
      {children}
    </div>
  );
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, icon, action, children, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8', className)} {...props}>
      <div className="flex items-center gap-4">
        {icon && <div>{icon}</div>}
        <div>
          <h1 className="text-3xl font-bold text-textPrimary m-0">{title}</h1>
          {description && <p className="text-textSecondary mt-2 mb-0">{description}</p>}
        </div>
      </div>
      {(action || children) && (
        <div className="flex items-center gap-3">
          {children}
          {action}
        </div>
      )}
    </div>
  );
}
