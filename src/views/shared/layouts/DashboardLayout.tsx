'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthService, AuthUser } from '@/core/services/auth/AuthService';
import { ToastProvider, ToastViewport } from '../ui/toast';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import { NotificationProvider } from '@/lib/contexts/NotificationContext';
import { NavigationProgress } from '@/components/navigation/NavigationProgress';

/**
 * Props for DashboardLayout component
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: AuthUser | null;
}

/**
 * DashboardLayout Component
 * Main layout wrapper for authenticated dashboard pages
 * Provides sidebar navigation, header, and content area with providers
 * 
 * @param {DashboardLayoutProps} props - Component props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {AuthUser | null} props.user - Currently authenticated user
 */
export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  /**
   * Handle user logout
   * Calls AuthService to clear session and redirects to login page
   */
  const handleLogout = async () => {
    try {
      await AuthService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Toggle mobile sidebar visibility
   */
  const handleMenuClick = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  /**
   * Toggle desktop sidebar collapse state
   * Switches between full sidebar (w-64) and icon-only sidebar (w-16)
   */
  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  /**
   * Close mobile drawer with Escape key and lock body scroll when open
   */
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // Prevent background scroll on mobile when drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileSidebarOpen]);

  return (
    <ToastProvider>
      <NotificationProvider>
        {/* Navigation progress indicator */}
        <NavigationProgress />
        
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* Sidebar for desktop with collapse functionality */}
          <Sidebar 
            userRole={user?.role} 
            variant="desktop" 
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          {/* Mobile sidebar overlay */}
          {isMobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <aside
                className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] border-r bg-background shadow-lg transition-transform duration-300 ease-out lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                tabIndex={-1}
              >
                <Sidebar
                  userRole={user?.role}
                  variant="mobile"
                  onNavigate={() => setIsMobileSidebarOpen(false)}
                />
              </aside>
            </>
          )}

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header 
              user={user} 
              onLogout={handleLogout}
              onMenuClick={handleMenuClick}
            />
            
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>
        <ToastViewport />
      </NotificationProvider>
    </ToastProvider>
  );
}

