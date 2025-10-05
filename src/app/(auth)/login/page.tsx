'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { LoginForm } from '@/views/auth/LoginForm';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Login Page
 * Handles user authentication
 */
export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated (removed - login function handles redirect)
  // useEffect(() => {
  //   if (isAuthenticated && !loading) {
  //     router.push('/');
  //   }
  // }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return <LoginForm onSubmit={login} />;
}
