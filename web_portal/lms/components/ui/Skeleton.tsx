import React from 'react';
import { cn } from '../../core/utils/cn';

// Shimmer keyframe injected once into the page
if (typeof document !== 'undefined') {
  const STYLE_ID = '__nermai_skeleton_shimmer';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes nermai-shimmer {
        0%   { background-position: -800px 0; }
        100% { background-position: 800px 0; }
      }
      .nermai-shimmer {
        background: linear-gradient(
          90deg,
          #dcdcdc 0%,
          #f5f5f5 50%,
          #dcdcdc 100%
        ) !important;
        background-size: 1600px 100% !important;
        animation: nermai-shimmer 1.2s infinite linear !important;
      }
      .dark .nermai-shimmer {
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0.06) 0%,
          rgba(255,255,255,0.20) 50%,
          rgba(255,255,255,0.06) 100%
        ) !important;
        background-size: 1600px 100% !important;
        animation: nermai-shimmer 1.2s infinite linear !important;
      }
    `;
    document.head.appendChild(style);
  }
}

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('nermai-shimmer rounded-md', className)}
      {...props}
    />
  );
}

// Generic Educational Loading Screen used by all page variants
function GenericEducationalLoader({ message = "Preparing your educational content" }: { message?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-20 min-h-[350px]">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-red-100 dark:border-red-950/40 border-t-red-700 dark:border-t-red-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-red-700/10 dark:bg-red-500/20 animate-ping" />
        </div>
      </div>
      <p className="text-base font-semibold text-gray-800 dark:text-gray-200 tracking-wide">
        Loading...
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {message}
      </p>
    </div>
  );
}

// Pre-configured structural skeletons (all standardized to the educational spinner)
function CardSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading content..." />;
}

function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return <GenericEducationalLoader message="Preparing your educational content..." />;
}

function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return <GenericEducationalLoader message="Loading records..." />;
}

function DashboardSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading dashboard overview..." />;
}

function CoursePlayerSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading course player..." />;
}

function ResourceViewerSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading resources..." />;
}

function FormSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading details..." />;
}

function ProfileSkeleton({ className }: { className?: string }) {
  return <GenericEducationalLoader message="Loading profile..." />;
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
