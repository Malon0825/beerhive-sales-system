'use client';

import { Suspense } from 'react';
import { FullscreenToggleButton } from './FullscreenToggleButton';

/**
 * FullscreenToggleButtonWrapper Component
 * 
 * Wraps FullscreenToggleButton in a Suspense boundary to comply with Next.js
 * static rendering requirements for components using useSearchParams.
 * 
 * This wrapper ensures the component doesn't cause build errors when used
 * in pages that need to be statically generated.
 */
export function FullscreenToggleButtonWrapper() {
  return (
    <Suspense fallback={null}>
      <FullscreenToggleButton />
    </Suspense>
  );
}
