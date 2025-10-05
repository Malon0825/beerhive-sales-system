'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { CustomerOrderHistory } from '@/views/customers/CustomerOrderHistory';
import { useAuth } from '@/lib/hooks/useAuth';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';
import { getDefaultRouteForRole } from '@/lib/utils/roleBasedAccess';
import { 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  Award,
  Loader2
} from 'lucide-react';

/**
 * Dashboard Home Page
 * Shows customer order history and statistics
 * 
 * Access Control:
 * - Admin: Can access dashboard (/)
 * - Manager: Can access dashboard (/)
 * - Cashier: Can access dashboard (/)
 * - Kitchen: Auto-redirected to /kitchen
 * - Bartender: Auto-redirected to /bartender
 * - Waiter: Auto-redirected to /waiter
 * 
 * Features:
 * - Customer statistics cards
 * - Order history with filtering
 * - Expandable order details
 */
export default function DashboardPage() {
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
    console.log('📍 [Dashboard Page] useEffect triggered', {
      authLoading,
      hasUser: !!user,
      username: user?.username,
      roles: user?.roles
    });

    if (authLoading) {
      console.log('⏳ [Dashboard Page] Still loading auth, waiting...');
      return;
    }

    if (!user) {
      console.log('❌ [Dashboard Page] No user found');
      return;
    }

    console.log('👤 [Dashboard Page] User loaded:', {
      username: user.username,
      fullName: user.full_name,
      roles: user.roles,
      userId: user.id
    });

    // Check if user has any of the redirect-only roles
    const redirectOnlyRoles = [UserRole.KITCHEN, UserRole.BARTENDER, UserRole.WAITER];
    const shouldRedirect = user.roles.some((role: string) => 
      redirectOnlyRoles.includes(role as UserRole)
    );
    
    console.log('🔍 [Dashboard Page] Checking redirect logic:', {
      userRoles: user.roles,
      redirectOnlyRoles,
      shouldRedirect
    });
    
    if (shouldRedirect) {
      const defaultRoute = getDefaultRouteForRole(user.roles as UserRole[]);
      console.log(`🚀 [Dashboard Page] Redirecting ${user.username} to ${defaultRoute}`, {
        reason: 'User has redirect-only role (kitchen/bartender/waiter)',
        roles: user.roles,
        destination: defaultRoute
      });
      router.push(defaultRoute);
    } else {
      console.log('✅ [Dashboard Page] User can access dashboard:', {
        username: user.username,
        roles: user.roles,
        reason: 'User is admin/manager/cashier'
      });
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
      console.log('🔍 [Dashboard Page] Fetching customer data...');
      
      // TODO: Replace with actual customer lookup by user email or phone
      // For now, we'll use a default customer ID from query params or URL
      const urlParams = new URLSearchParams(window.location.search);
      const customerId = urlParams.get('customerId');
      
      console.log('📋 [Dashboard Page] Customer ID from URL:', customerId);
      
      if (customerId) {
        console.log(`🌐 [Dashboard Page] Fetching customer data for ID: ${customerId}`);
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();
        
        console.log('📦 [Dashboard Page] Customer data response:', {
          ok: response.ok,
          status: response.status,
          success: result.success,
          hasData: !!result.data
        });
        
        if (response.ok && result.success) {
          setCustomerData(result.data);
          console.log('✅ [Dashboard Page] Customer data loaded successfully');
        } else {
          console.warn('⚠️ [Dashboard Page] Failed to fetch customer data:', result);
        }
      } else {
        console.log('ℹ️ [Dashboard Page] No customer ID provided in URL parameters');
      }
    } catch (error) {
      console.error('❌ [Dashboard Page] Error fetching customer data:', error);
    } finally {
      setLoading(false);
      console.log('🏁 [Dashboard Page] Customer data fetch completed');
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
          <h1 className="text-3xl font-bold">
            Welcome{user?.full_name ? `, ${user.full_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            View your order history and track your purchases
          </p>
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
              <div className="text-2xl font-bold">
                {customerData.visit_count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(customerData.total_spent || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time spending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customerData.loyalty_points || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Available points
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Tier</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {customerData.tier?.replace('_', ' ') || 'Regular'}
              </div>
              <p className="text-xs text-muted-foreground">
                Current status
              </p>
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
        <CustomerOrderHistory 
          customerId={customerData?.id}
          limit={20}
          showFilters={true}
        />
      </div>

      {/* Quick Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Contact our support team for assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Opening Hours: 11:00 AM - 2:00 AM daily</span>
          </div>
          <p className="text-sm text-muted-foreground">
            For inquiries about your orders or membership, please visit our counter
            or contact us during business hours.
          </p>
        </CardContent>
      </Card>
      </div>
    </RouteGuard>
  );
}
