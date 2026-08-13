import React from 'react';
import { cn } from '../../core/utils/cn';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-slate-700/50', className)}
      {...props}
    />
  );
}

// Pre-configured structural skeletons
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e] p-6 shadow-sm', className)}>
      <Skeleton className="h-5 w-1/3 mb-4 bg-gray-250 dark:bg-white/10" />
      <Skeleton className="h-4 w-full mb-2 bg-gray-250 dark:bg-white/10" />
      <Skeleton className="h-4 w-5/6 mb-4 bg-gray-250 dark:bg-white/10" />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-24 rounded-md bg-gray-250 dark:bg-white/10" />
      </div>
    </div>
  );
}

function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('w-full border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white/50 dark:bg-[#1a1a2e]/50', className)}>
      <div className="bg-gray-50 dark:bg-[#252542]/50 p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <Skeleton className="h-5 w-28 bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-5 w-36 bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-5 w-28 bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-5 w-20 bg-gray-250 dark:bg-white/10" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100 dark:border-gray-850 flex justify-between items-center bg-white dark:bg-[#1a1a2e]">
          <Skeleton className="h-4 w-36 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-4 w-44 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-4 w-24 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-8 w-8 rounded-full bg-gray-250 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 w-full', className)}>
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <Skeleton className="h-8 w-64 bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-4 w-96 bg-gray-250 dark:bg-white/10" />
      </div>
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e] shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 bg-gray-250 dark:bg-white/10" />
              <Skeleton className="h-8 w-8 rounded-lg bg-gray-250 dark:bg-white/10" />
            </div>
            <Skeleton className="h-8 w-32 bg-gray-250 dark:bg-white/10" />
            <Skeleton className="h-3 w-40 bg-gray-250 dark:bg-white/10" />
          </div>
        ))}
      </div>
      {/* Main Content Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e] space-y-4">
          <Skeleton className="h-6 w-48 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-48 w-full rounded-lg bg-gray-250 dark:bg-white/10" />
        </div>
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e] space-y-4">
          <Skeleton className="h-6 w-36 bg-gray-250 dark:bg-white/10" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-10 w-10 rounded-full bg-gray-250 dark:bg-white/10" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full bg-gray-250 dark:bg-white/10" />
                <Skeleton className="h-3 w-2/3 bg-gray-250 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursePlayerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-4 gap-6 w-full h-full min-h-[500px]', className)}>
      <div className="lg:col-span-3 space-y-4">
        <Skeleton className="w-full aspect-video rounded-xl bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-8 w-3/4 bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-4 w-full bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-4 w-5/6 bg-gray-250 dark:bg-white/10" />
      </div>
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e] space-y-4">
        <Skeleton className="h-6 w-32 bg-gray-250 dark:bg-white/10" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <Skeleton className="h-6 w-6 rounded bg-gray-250 dark:bg-white/10" />
            <Skeleton className="h-4 flex-1 bg-gray-250 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceViewerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 w-full', className)}>
      <div className="flex justify-between items-center p-4 rounded-xl bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-800">
        <Skeleton className="h-6 w-48 bg-gray-250 dark:bg-white/10" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-9 w-24 rounded-lg bg-gray-250 dark:bg-white/10" />
        </div>
      </div>
      <Skeleton className="w-full h-[600px] rounded-xl bg-gray-250 dark:bg-white/10" />
    </div>
  );
}

function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a2e]', className)}>
      <Skeleton className="h-6 w-48 mb-4 bg-gray-250 dark:bg-white/10" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-10 w-full rounded-lg bg-gray-250 dark:bg-white/10" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-lg bg-gray-250 dark:bg-white/10" />
        <Skeleton className="h-10 w-32 rounded-lg bg-gray-250 dark:bg-white/10" />
      </div>
    </div>
  );
}

function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 w-full', className)}>
      <div className="p-6 rounded-2xl bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-800 flex items-center gap-6">
        <Skeleton className="h-24 w-24 rounded-full bg-gray-250 dark:bg-white/10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-4 w-64 bg-gray-250 dark:bg-white/10" />
          <Skeleton className="h-4 w-36 bg-gray-250 dark:bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSkeleton />
        <FormSkeleton />
      </div>
    </div>
  );
}

export {
  Skeleton,
  CardSkeleton,
  CardGridSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  CoursePlayerSkeleton,
  ResourceViewerSkeleton,
  FormSkeleton,
  ProfileSkeleton,
};
