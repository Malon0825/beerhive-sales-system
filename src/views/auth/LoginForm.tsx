'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { Card } from '../shared/ui/card';
import Image from 'next/image';
import { VersionBadge } from '@/components/shared/VersionBadge';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
}

/**
 * LoginForm Component
 * Renders the login UI and now shows the application version using `VersionBadge`.
 */
export function LoginForm({ onSubmit }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleFormSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(data.username, data.password);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative h-24 w-24">
              <Image
                src="/beerhive-logo.png"
                alt="BeerHive Logo"
                width={96}
                height={96}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            BeerHive POS
          </h1>
          <div className="mb-2 flex justify-center">
            <VersionBadge />
          </div>
          <p className="text-gray-600">
            Sign in to access the point of sale system
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              disabled={isLoading}
              {...register('username')}
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                disabled={isLoading}
                {...register('password')}
                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help? Contact your administrator</p>
        </div>
      </Card>

      <div className="fixed bottom-4 text-center text-sm text-gray-600">
        <p>© 2025 BeerHive POS System. All rights reserved.</p>
      </div>
    </div>
  );
}
