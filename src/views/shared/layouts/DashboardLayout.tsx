'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthService, AuthUser } from '@/core/services/auth/AuthService';
import { ToastProvider, ToastViewport } from '../ui/toast';
import { ErrorBoundary } from '../feedback/ErrorBoundary';
import { NotificationProvider } from '@/lib/contexts/NotificationContext';

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

  return (
    <ToastProvider>
      <NotificationProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* Sidebar for desktop */}
          <Sidebar userRole={user?.role} />

          {/* Mobile sidebar overlay */}
          {isMobileSidebarOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background lg:hidden">
                <Sidebar userRole={user?.role} />
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
