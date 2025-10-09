'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/formatters';

/**
 * Bill data structure for tab sessions
 */
interface BillData {
  session: {
    id: string;
    session_number: string;
    opened_at: string;
    duration_minutes: number;
    table?: {
      table_number: string;
      area?: string;
    };
    customer?: {
      full_name: string;
      customer_number?: string;
      tier?: string;
    };
  };
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    items: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      total: number;
      is_complimentary: boolean;
      is_vip_price: boolean;
      notes?: string;
    }>;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
  }>;
  totals: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
  };
}

interface TabBillReceiptProps {
  billData: BillData;
  isPrintMode?: boolean;
}

/**
 * TabBillReceipt Component
 * 
 * Attractive bill preview for tab sessions matching the receipt design.
 * Features:
 * - BeerHive logo and branding
 * - Session information with duration
 * - All orders grouped by order number
 * - Professional receipt-style layout
 * - Proper 80mm thermal printer dimensions
 * - Print-optimized styling
 * 
 * @component
 */
export default function TabBillReceipt({ billData, isPrintMode = false }: TabBillReceiptProps) {
  /**
   * Format date and time for display
   */
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
    }
  };

  /**
   * Format time only
   */
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return dateString;
    }
  };

  /**
   * Format duration in a readable way
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  /**
   * Get tier display name
   */
  const formatTier = (tier?: string): string => {
    if (!tier || tier === 'regular') return 'Regular';
    if (tier === 'vip_platinum') return 'VIP Platinum';
    if (tier === 'vip_gold') return 'VIP Gold';
    if (tier === 'vip_silver') return 'VIP Silver';
    return tier;
  };

  return (
    <div 
      className={`${isPrintMode ? 'print-bill-receipt' : ''} bg-white`}
      style={isPrintMode ? { 
        maxWidth: '80mm', 
        margin: '0 auto', 
        padding: '8mm',
        fontFamily: 'monospace'
      } : { 
        padding: '2rem',
        fontFamily: 'monospace',
        maxWidth: '400px',
        margin: '0 auto'
      }}
    >
      {/* Logo and Business Name */}
      <div className="text-center mb-3">
        <div className="flex justify-center mb-2">
          <Image
            src="/beerhive-logo.png"
            alt="BeerHive Pub Logo"
            width={100}
            height={100}
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-2xl font-bold tracking-wider mb-1" style={{ letterSpacing: '0.1em' }}>
          BEERHIVE PUB
        </h1>
        <p className="text-xs text-gray-700">Craft Beer & Great Food</p>
        <p className="text-xs text-gray-600">Customer Bill Preview</p>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-gray-800 my-3" />

      {/* Session Information */}
      <div className="mb-3">
        <div className="text-center mb-2">
          <div className="inline-block bg-amber-100 border-2 border-amber-500 rounded-lg px-3 py-1">
            <p className="text-xs text-amber-800 font-semibold">TAB SESSION</p>
            <p className="text-base font-bold text-amber-900">{billData.session.session_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-1 text-sm bg-gray-50 p-2 rounded">
          <div className="text-gray-700">Opened:</div>
          <div className="text-right font-medium">{formatDateTime(billData.session.opened_at)}</div>
          
          <div className="text-gray-700">Duration:</div>
          <div className="text-right font-medium">{formatDuration(billData.session.duration_minutes)}</div>
          
          {billData.session.table && (
            <>
              <div className="text-gray-700">Table:</div>
              <div className="text-right font-semibold">
                Table {billData.session.table.table_number}
                {billData.session.table.area && ` (${billData.session.table.area})`}
              </div>
            </>
          )}
          
          {billData.session.customer && (
            <>
              <div className="text-gray-700">Customer:</div>
              <div className="text-right font-medium">{billData.session.customer.full_name}</div>
              
              {billData.session.customer.customer_number && (
                <>
                  <div className="text-gray-700">Customer #:</div>
                  <div className="text-right">{billData.session.customer.customer_number}</div>
                </>
              )}
              
              {billData.session.customer.tier && billData.session.customer.tier !== 'regular' && (
                <>
                  <div className="text-gray-700">Tier:</div>
                  <div className="text-right">
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-semibold">
                      {formatTier(billData.session.customer.tier)}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-3" />

      {/* All Orders */}
      <div className="mb-3">
        <h3 className="font-bold text-sm mb-2 text-center uppercase tracking-wide border-b-2 border-gray-800 pb-1">
          Order History
        </h3>

        {billData.orders.map((order, orderIndex) => (
          <div key={order.id} className="mb-3 last:mb-0">
            {/* Order Header */}
            <div className="bg-blue-50 p-1.5 rounded-t border-l-4 border-blue-500">
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold text-blue-900">{order.order_number}</div>
                <div className="text-blue-700">{formatTime(order.created_at)}</div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-l-4 border-blue-200 pl-2 pt-1 pb-2 mb-1">
              <table className="w-full text-sm">
                <tbody>
                  {order.items.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                      <tr className="border-b border-gray-100">
                        <td className="py-1 pr-2">
                          <span className="font-medium">{item.quantity}x</span> {item.item_name}
                        </td>
                        <td className="text-right py-1 font-semibold whitespace-nowrap">
                          {item.is_complimentary ? (
                            <span className="text-green-600 text-xs font-bold">FREE</span>
                          ) : (
                            formatCurrency(item.total)
                          )}
                        </td>
                      </tr>
                      {/* Item Badges */}
                      {(item.is_vip_price || item.is_complimentary || item.notes) && (
                        <tr>
                          <td colSpan={2} className="pb-1">
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.is_vip_price && (
                                <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                  ★ VIP Price
                                </span>
                              )}
                              {item.is_complimentary && (
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  ✓ Complimentary
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <div className="text-xs text-gray-600 mt-1 italic">
                                ⓘ {item.notes}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Order Subtotal */}
              <div className="mt-1 pt-1 border-t border-gray-300">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Order Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold">
                  <span>Order Total:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-gray-800 my-3" />

      {/* Grand Totals */}
      <div className="mb-3">
        <h3 className="font-bold text-sm mb-2 text-center uppercase tracking-wide">
          Bill Summary
        </h3>
        <div className="space-y-1 text-sm bg-amber-50 p-2 rounded-lg border-2 border-amber-200">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal:</span>
            <span className="font-medium">{formatCurrency(billData.totals.subtotal)}</span>
          </div>
          {billData.totals.discount_amount > 0 && (
            <div className="flex justify-between text-green-700">
              <span className="font-medium">Total Discount:</span>
              <span className="font-semibold">-{formatCurrency(billData.totals.discount_amount)}</span>
            </div>
          )}
          {billData.totals.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-700">Tax:</span>
              <span className="font-medium">{formatCurrency(billData.totals.tax_amount)}</span>
            </div>
          )}
        </div>
        
        <div className="bg-green-600 text-white mt-2 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold uppercase">TOTAL AMOUNT:</span>
            <span className="text-2xl font-bold">{formatCurrency(billData.totals.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-gray-800 my-3" />

      {/* Important Notice */}
      <div className="mb-3">
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs font-bold text-yellow-900 uppercase tracking-wide">
              ⚠️ IMPORTANT NOTICE ⚠️
            </p>
            <p className="text-xs text-yellow-800 mt-1 font-semibold">
              THIS IS NOT AN OFFICIAL RECEIPT
            </p>
            <p className="text-xs text-yellow-700">
              This is a bill preview for customer reference only.
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Official receipt will be issued upon payment.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="text-center space-y-2 py-2">
        <div className="mb-2">
          <p className="text-sm font-bold text-gray-800">Thank You For Choosing Us!</p>
          <p className="text-xs font-semibold text-amber-700 mt-0.5">Please Proceed to Payment Counter</p>
        </div>
        
        <div className="border-t border-gray-300 pt-2 mt-2">
          <p className="text-xs text-gray-600 italic">
            Questions? Ask our friendly staff!
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Visit us at www.beerhivepub.com
          </p>
        </div>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Printed: {format(new Date(), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
      )}
    </div>
  );
}
