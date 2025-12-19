import React from 'react';
import { cn } from '../../lib/utils';

// Base skeleton component
export const Skeleton: React.FC<{
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}> = ({ className, animate = true, style }) => {
  return (
    <div
      className={cn(
        "bg-muted rounded",
        animate && "animate-pulse",
        className
      )}
      style={style}
    />
  );
};

// Text line skeleton
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className, lastLineWidth = '60%' }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? lastLineWidth : '100%',
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Avatar skeleton
export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
  );
};

// Button skeleton
export const SkeletonButton: React.FC<{
  width?: string;
  className?: string;
}> = ({ width = '100px', className }) => {
  return (
    <Skeleton
      className={cn("h-9 rounded-lg", className)}
      style={{ width }}
    />
  );
};

// Card skeleton
export const SkeletonCard: React.FC<{
  hasImage?: boolean;
  className?: string;
}> = ({ hasImage = false, className }) => {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-4 space-y-4", className)}>
      {hasImage && (
        <Skeleton className="w-full h-32 rounded-lg" />
      )}
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
};

// Code block skeleton
export const SkeletonCodeBlock: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 8, className }) => {
  return (
    <div className={cn("rounded-lg overflow-hidden border border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            <div className="w-3 h-3 rounded-full bg-gray-600" />
          </div>
          <Skeleton className="h-3 w-16 bg-gray-700" />
        </div>
        <Skeleton className="h-6 w-6 rounded bg-gray-700" />
      </div>
      {/* Code lines */}
      <div className="bg-[#282c34] p-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-6 bg-gray-700" />
            <Skeleton
              className="h-4 bg-gray-700"
              style={{
                width: `${Math.random() * 40 + 30}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Chat message skeleton
export const SkeletonChatMessage: React.FC<{
  isUser?: boolean;
  className?: string;
}> = ({ isUser = false, className }) => {
  return (
    <div className={cn(
      "flex gap-3",
      isUser ? "flex-row-reverse" : "flex-row",
      className
    )}>
      <SkeletonAvatar size="sm" />
      <div className={cn(
        "flex-1 max-w-[80%] space-y-2 p-4 rounded-2xl",
        isUser ? "bg-primary/20" : "bg-muted"
      )}>
        <SkeletonText lines={2} lastLineWidth="70%" />
      </div>
    </div>
  );
};

// File explorer skeleton
export const SkeletonFileExplorer: React.FC<{
  items?: number;
  className?: string;
}> = ({ items = 6, className }) => {
  return (
    <div className={cn("space-y-1 p-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton 
            className="h-4" 
            style={{ width: `${Math.random() * 40 + 40}%` }}
          />
        </div>
      ))}
    </div>
  );
};

// Project card skeleton
export const SkeletonProjectCard: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      <Skeleton className="w-full h-32" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
};

// Table skeleton
export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-4 py-3 flex gap-4 border-t border-border">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4 flex-1"
              style={{ width: `${Math.random() * 30 + 50}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Panel skeleton (for side panels)
export const SkeletonPanel: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn("p-4 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      {/* Content */}
      <SkeletonText lines={4} />
      {/* Action button */}
      <SkeletonButton width="100%" />
    </div>
  );
};

// Full page loading skeleton
export const SkeletonPage: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn("flex h-full", className)}>
      {/* Sidebar */}
      <div className="w-64 border-r border-border p-4 space-y-4">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} hasImage />
          ))}
        </div>
        <SkeletonTable rows={4} columns={4} />
      </div>
    </div>
  );
};

export default Skeleton;
