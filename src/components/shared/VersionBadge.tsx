'use client';

import React from 'react';
import { APP_VERSION } from '@/lib/constants/version';

export interface VersionBadgeProps {
  /** Optional additional CSS classes for layout spacing */
  className?: string;
  /** Visual size of the badge */
  size?: 'sm' | 'md';
  /** Optional prefix to show before the version (defaults to 'v') */
  prefix?: string;
}

/**
 * VersionBadge Component
 *
 * Small badge to display the application semantic version consistently
 * across the app (e.g., login page, sidebar).
 *
 * Uses the centralized `APP_VERSION` constant to avoid duplication.
 */
export function VersionBadge({ className = '', size = 'sm', prefix = 'v' }: VersionBadgeProps) {
  const padding = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const textSize = size === 'md' ? 'text-xs' : 'text-[10px]';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-amber-300/40 bg-amber-50 text-amber-800 ${padding} ${textSize} font-medium shadow-sm ${className}`}
      aria-label={`Application version ${APP_VERSION}`}
    >
      {prefix}{APP_VERSION}
    </span>
  );
}
