'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { CustomerOrderHistory } from '@/views/customers/CustomerOrderHistory';
import { useAuth } from '@/lib/hooks/useAuth';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { getDefaultRouteForRole } from '@/lib/utils/roleBasedAccess';
import { ShoppingCart, TrendingUp, Clock, Award, Loader2 } from 'lucide-react';

/**
 * Dashboard Home Client Component
 *
 * This is the client-side implementation previously in `src/app/(dashboard)/page.tsx`.
 * It is split out to ensure the App Router page remains a Server Component,
 * which allows Next.js to generate the client-reference-manifest correctly
 * during Vercel builds (see `docs/VERCEL_DEPLOYMENT_FIX.md`).
 */
export function DashboardHomeClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Redirect users to their default page based on role
   * Only redirect kitchen, bartender, and waiter staff
   * Admin, Manager, and Cashier can access the dashboard
   */
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const redirectOnlyRoles = [UserRole.KITCHEN, UserRole.BARTENDER, UserRole.WAITER];
    const shouldRedirect = user.roles?.some((role: string) => redirectOnlyRoles.includes(role as UserRole));

    if (shouldRedirect) {
      const defaultRoute = getDefaultRouteForRole(user.roles as UserRole[]);
      router.push(defaultRoute);
    }
  }, [authLoading, user, router]);

  /**
   * Fetch customer data if user has an associated customer record
   */
  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  /**
   * Fetch customer information and statistics
   */
  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const customerId = urlParams.get('customerId');

      if (customerId) {
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();
        if (response.ok && result.success) {
          setCustomerData(result.data);
        }
      }
    } catch (error) {
      console.error('DashboardHomeClient fetchCustomerData error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Show loading while checking authentication and redirecting
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Admin, Manager, and Cashier can view the dashboard
  // Kitchen, Bartender, and Waiter are redirected by the useEffect above
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER]}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Welcome{user?.full_name ? `, ${user.full_name}` : ''}!</h1>
          <p className="text-muted-foreground">View your order history and track your purchases</p>
        </div>

        {/* Customer Statistics */}
        {customerData && !loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerData.visit_count || 0}</div>
                <p className="text-xs text-muted-foreground">Lifetime orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(customerData.total_spent || 0)}</div>
                <p className="text-xs text-muted-foreground">All time spending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerData.loyalty_points || 0}</div>
                <p className="text-xs text-muted-foreground">Available points</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member Tier</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{customerData.tier?.replace('_', ' ') || 'Regular'}</div>
                <p className="text-xs text-muted-foreground">Current status</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State for Statistics */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Order History */}
        <div>
          <CustomerOrderHistory customerId={customerData?.id} limit={20} showFilters={true} />
        </div>

        {/* Quick Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Contact our support team for assistance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Opening Hours: 11:00 AM - 2:00 AM daily</span>
            </div>
            <p className="text-sm text-muted-foreground">
              For inquiries about your orders or membership, please visit our counter or contact us during
              business hours.
            </p>
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
