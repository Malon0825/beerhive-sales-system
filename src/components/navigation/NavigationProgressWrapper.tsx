'use client';

import { Suspense } from 'react';
import { NavigationProgress } from './NavigationProgress';

/**
 * NavigationProgressWrapper Component
 * 
 * Wraps NavigationProgress in a Suspense boundary to comply with Next.js
 * static rendering requirements for components using useSearchParams.
 * 
 * This wrapper ensures the component doesn't cause build errors when used
 * in layouts or pages that need to be statically generated.
 */
export function NavigationProgressWrapper() {
  return (
    <Suspense fallback={null}>
      <NavigationProgress />
    </Suspense>
  );
}
