'use client';

import { Customer } from '@/models/entities/Customer';
import { Card } from '@/views/shared/ui/card';
import { TierBadge } from './TierBadge';
import { Phone, Mail, Calendar, TrendingUp, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface CustomerCardProps {
  customer: Customer;
}

/**
 * CustomerCard Component
 * Displays individual customer information in a card format
 * Shows:
 * - Customer name and number
 * - VIP tier badge
 * - Contact information
 * - Visit statistics
 * - Total spent and loyalty points
 */
export function CustomerCard({ customer }: CustomerCardProps) {
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
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <Link href={`/customers/${customer.id}`}>
        <div className="space-y-3">
          {/* Header: Name and Tier */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {customer.full_name}
              </h3>
              <p className="text-sm text-gray-500">{customer.customer_number}</p>
            </div>
            <TierBadge tier={customer.tier} />
          </div>

          {/* Contact Information */}
          <div className="space-y-1">
            {customer.phone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-3.5 w-3.5 mr-2" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 mr-2" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <div className="text-xs text-gray-500">Total Spent</div>
              <div className="text-sm font-semibold text-green-600">
                {formatCurrency(customer.total_spent || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Visits</div>
              <div className="text-sm font-semibold text-blue-600">
                {customer.visit_count || 0}
              </div>
            </div>
          </div>

          {/* Loyalty Points and Last Visit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500">Points</div>
              <div className="text-sm font-semibold text-amber-600">
                {customer.loyalty_points || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Last Visit</div>
              <div className="text-xs text-gray-600">
                {formatDate(customer.last_visit_date)}
              </div>
            </div>
          </div>

          {/* View Details Link */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm text-amber-600 hover:text-amber-700">
              <span>View Details</span>
              <Eye className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
}
