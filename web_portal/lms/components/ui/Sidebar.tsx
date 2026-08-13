import React from 'react';
import { cn } from '../../core/utils/cn';

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  isOpen: boolean;
}

export function Sidebar({ isOpen, className, children, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-surface transition-[width,min-width] duration-300 ease-in-out',
        isOpen ? 'w-[240px] min-w-[240px]' : 'w-0 min-w-0',
        className
      )}
      {...props}
    >
      <div className="flex-1 p-4">{children}</div>
    </aside>
  );
}

export interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function SidebarGroup({ title, children, className, ...props }: SidebarGroupProps) {
  return (
    <div className={cn('mb-8', className)} {...props}>
      {title && (
        <h4 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-primary">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: React.ReactNode;
}

// SidebarItem renders as a div so it can be safely wrapped in a NavLink anchor
export const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ icon, isActive, badge, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'border-l-2 border-primary bg-surfaceHighlight text-textPrimary shadow-sm'
            : 'border-l-2 border-transparent text-textSecondary hover:bg-surfaceHighlight/50 hover:text-textPrimary hover:shadow-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center transition-colors',
                isActive ? 'text-textPrimary' : 'text-textSecondary group-hover:text-textPrimary'
              )}
            >
              {icon}
            </span>
          )}
          <span className="truncate whitespace-nowrap">{children}</span>
        </div>
        {badge && <div className="ml-auto">{badge}</div>}
      </div>
    );
  }
);
SidebarItem.displayName = 'SidebarItem';
