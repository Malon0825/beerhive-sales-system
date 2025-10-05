'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthService, AuthUser } from '@/core/services/auth/AuthService';
import { ToastProvider, ToastViewport } from '../ui/toast';
import { ErrorBoundary } from '../feedback/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: AuthUser | null;
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuClick = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
