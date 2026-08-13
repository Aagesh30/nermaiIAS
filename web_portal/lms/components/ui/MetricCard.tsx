import React from 'react';
import { Card, CardContent, CardHeader, CardDescription } from './Card';
import { cn } from '../../core/utils/cn';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
}

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    { title, value, icon: Icon, iconColorClass = 'text-primary', iconBgClass = 'bg-primary/10', trend, className, ...props },
    ref
  ) => {
    return (
      <Card ref={ref} className={cn('relative overflow-hidden group hover:border-primary/50 transition-colors', className)} {...props}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription className="font-medium text-textSecondary">{title}</CardDescription>
            <div className={cn('p-2 rounded-lg', iconBgClass, iconColorClass)}>
              <Icon size={18} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-textPrimary">{value}</div>
            {trend && (
              <div className={cn('text-sm font-medium mb-1', trend.isPositive ? 'text-success' : 'text-destructive')}>
                {trend.isPositive ? '+' : '-'}{trend.value}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);
MetricCard.displayName = 'MetricCard';
