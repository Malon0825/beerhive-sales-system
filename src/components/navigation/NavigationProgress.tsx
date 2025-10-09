/**
 * NavigationProgress Component
 * Displays a loading progress bar during route navigation
 * Provides visual feedback to users when transitioning between pages
 */
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * NavigationProgress Component
 * Shows a horizontal progress bar at the top of the page during navigation
 * Automatically starts when route changes and completes when page loads
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start loading animation
    setIsLoading(true);
    setProgress(20);

    // Simulate progress increment
    const timer1 = setTimeout(() => setProgress(40), 100);
    const timer2 = setTimeout(() => setProgress(60), 300);
    const timer3 = setTimeout(() => setProgress(80), 500);

    // Complete loading after a short delay
    const completeTimer = setTimeout(() => {
      setProgress(100);
      // Hide the bar after animation completes
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(completeTimer);
    };
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent"
      role="progressbar"
      aria-label="Page loading progress"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 ease-out shadow-lg"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
        }}
      />
    </div>
  );
}
