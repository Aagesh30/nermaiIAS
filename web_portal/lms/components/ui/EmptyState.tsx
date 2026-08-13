import React from 'react';
import { cn } from '../../core/utils/cn';
import { Button, type ButtonProps } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: ButtonProps['variant'];
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center animate-in fade-in-50',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surfaceHighlight text-textSecondary">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-textPrimary">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-textSecondary">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
