'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/models/entities/Customer';
import { TierBadge } from './TierBadge';
import { Button } from '@/views/shared/ui/button';
import { Card } from '@/views/shared/ui/card';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock,
  DollarSign,
  Users,
  Gift,
  Edit
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface CustomerDetailProps {
  customerId: string;
}

/**
 * CustomerDetail Component
 * Displays detailed customer information including:
 * - Basic information (name, contact, tier)
 * - Statistics (total spent, visits, loyalty points)
 * - Special dates (birthday, anniversary)
 * - Purchase history
 */
export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch customer data from API
   */
  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  /**
   * Fetch customer details
   */
  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/${customerId}?includeStats=true`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch customer');
      }

      setCustomer(result.data.customer);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customer');
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

  /**
   * Format date for display
   */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Calculate average spend per visit
   */
  const calculateAverageSpend = () => {
    if (!customer || customer.visit_count === 0) return 0;
    return customer.total_spent / customer.visit_count;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <Link href="/customers">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Error loading customer</p>
          <p className="text-red-500 text-sm mt-2">{error || 'Customer not found'}</p>
          <Button onClick={fetchCustomer} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.full_name}</h1>
            <p className="text-gray-600 mt-1">Customer #{customer.customer_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <TierBadge tier={customer.tier} />
          <Link href={`/customers/${customerId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(customer.total_spent || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {customer.visit_count || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Loyalty Points</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {customer.loyalty_points || 0}
              </p>
            </div>
            <Award className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Spend</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(calculateAverageSpend())}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 opacity-20" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-4">
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-900">{customer.phone}</p>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-gray-900">{customer.email}</p>
                </div>
              </div>
            )}

            {!customer.phone && !customer.email && (
              <p className="text-gray-500 text-sm">No contact information available</p>
            )}
          </div>
        </Card>

        {/* Special Dates */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Dates</h2>
          <div className="space-y-4">
            {customer.birth_date && (
              <div className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="text-sm text-gray-600">Birthday</p>
                  <p className="text-gray-900">{formatDate(customer.birth_date)}</p>
                </div>
              </div>
            )}

            {customer.anniversary_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Anniversary</p>
                  <p className="text-gray-900">{formatDate(customer.anniversary_date)}</p>
                </div>
              </div>
            )}

            {!customer.birth_date && !customer.anniversary_date && (
              <p className="text-gray-500 text-sm">No special dates recorded</p>
            )}
          </div>
        </Card>
      </div>

      {/* Customer Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="text-gray-900">{formatDate(customer.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Last Visit</p>
              <p className="text-gray-900">{formatDate(customer.last_visit_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">VIP Status</p>
              <p className="text-gray-900">
                {customer.vip_membership_number ? customer.vip_membership_number : 'Regular Customer'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
        </Card>
      )}
    </div>
  );
}
