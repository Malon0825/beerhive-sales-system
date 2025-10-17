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
  throw new Error('TabBillReceipt is deprecated. Use PrintableReceipt from /views/pos instead.');
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
        paddingBottom: '14mm',
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
            src="/receipt-logo.png"
            alt="BeerHive Receipt Logo"
            width={100}
            height={100}
            className="object-contain grayscale contrast-200"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-2xl font-bold tracking-wider mb-1 text-black" style={{ letterSpacing: '0.1em' }}>
          BEERHIVE PUB
        </h1>
        <p className="text-xs text-black">Craft Beer & Great Food</p>
        <p className="text-xs text-black">Customer Bill Preview</p>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-3" />

      {/* Session Information */}
      <div className="mb-3">
        <div className="text-center mb-2">
          <div className="inline-block border border-black rounded-lg px-3 py-1">
            <p className="text-xs text-black font-semibold uppercase">TAB SESSION</p>
            <p className="text-base font-bold text-black">{billData.session.session_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-1 text-sm border border-black p-2 rounded">
          <div className="text-black">Opened:</div>
          <div className="text-right font-medium">{formatDateTime(billData.session.opened_at)}</div>
          
          <div className="text-black">Duration:</div>
          <div className="text-right font-medium">{formatDuration(billData.session.duration_minutes)}</div>
          
          {billData.session.table && (
            <>
              <div className="text-black">Table:</div>
              <div className="text-right font-semibold">
                Table {billData.session.table.table_number}
                {billData.session.table.area && ` (${billData.session.table.area})`}
              </div>
            </>
          )}
          
          {billData.session.customer && (
            <>
              <div className="text-black">Customer:</div>
              <div className="text-right font-medium">{billData.session.customer.full_name}</div>
              
              {billData.session.customer.customer_number && (
                <>
                  <div className="text-black">Customer #:</div>
                  <div className="text-right">{billData.session.customer.customer_number}</div>
                </>
              )}
              
              {billData.session.customer.tier && billData.session.customer.tier !== 'regular' && (
                <>
                  <div className="text-black">Tier:</div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 border border-black text-black text-xs font-semibold rounded">
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
      <div className="border-t border-dashed border-black my-3" />

      {/* All Orders */}
      <div className="mb-3">
        <h3 className="font-bold text-sm mb-2 text-center uppercase tracking-wide border-b-2 border-black pb-1">
          Order History
        </h3>

        {billData.orders.map((order, orderIndex) => (
          <div key={order.id} className="mb-3 last:mb-0">
            {/* Order Header */}
            <div className="p-1.5 rounded-t border-l-4 border-black">
              <div className="flex items-center justify-between text-xs">
                <div className="font-semibold text-black">{order.order_number}</div>
                <div className="text-black">{formatTime(order.created_at)}</div>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-l-4 border-black pl-2 pt-1 pb-2 mb-1">
              <table className="w-full text-sm">
                <tbody>
                  {order.items.map((item, itemIndex) => (
                    <React.Fragment key={itemIndex}>
                      <tr className="border-b border-black">
                        <td className="py-1 pr-2">
                          <span className="font-medium">{item.quantity}x</span> {item.item_name}
                        </td>
                        <td className="text-right py-1 font-semibold whitespace-nowrap">
                          {item.is_complimentary ? (
                            <span className="text-xs font-bold text-black">FREE</span>
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
                                <span className="inline-block px-2 py-0.5 border border-black text-black text-xs font-medium rounded uppercase">
                                  VIP PRICE
                                </span>
                              )}
                              {item.is_complimentary && (
                                <span className="inline-block px-2 py-0.5 border border-black text-black text-xs font-medium rounded uppercase">
                                  COMPLIMENTARY
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <div className="text-xs mt-1 italic">
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
              <div className="mt-1 pt-1 border-t border-black">
                <div className="flex justify-between text-sm">
                  <span className="text-black">Order Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
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
      <div className="border-t-2 border-double border-black my-3" />

      {/* Grand Totals */}
      <div className="mb-3">
        <h3 className="font-bold text-sm mb-2 text-center uppercase tracking-wide">
          Bill Summary
        </h3>
        <div className="space-y-1 text-sm border border-black p-2 rounded-lg">
          <div className="flex justify-between">
            <span className="text-black">Subtotal:</span>
            <span className="font-medium">{formatCurrency(billData.totals.subtotal)}</span>
          </div>
          {billData.totals.discount_amount > 0 && (
            <div className="flex justify-between">
              <span className="font-medium">Total Discount:</span>
              <span className="font-semibold">-{formatCurrency(billData.totals.discount_amount)}</span>
            </div>
          )}
          {billData.totals.tax_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-black">Tax:</span>
              <span className="font-medium">{formatCurrency(billData.totals.tax_amount)}</span>
            </div>
          )}
        </div>
        
        <div className="border-2 border-black mt-2 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold uppercase">TOTAL AMOUNT:</span>
            <span className="text-2xl font-bold">{formatCurrency(billData.totals.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-3" />

      {/* Important Notice */}
      <div className="mb-3">
        <div className="border-2 border-black rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs font-bold text-black uppercase tracking-wide">
              ⚠️ IMPORTANT NOTICE ⚠️
            </p>
            <p className="text-xs text-black mt-1 font-semibold">
              THIS IS NOT AN OFFICIAL RECEIPT
            </p>
            <p className="text-xs text-black">
              This is a bill preview for customer reference only.
            </p>
            <p className="text-xs text-black mt-0.5">
              Official receipt will be issued upon payment.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="text-center space-y-2 py-2">
        <div className="mb-2">
          <p className="text-sm font-bold text-black">Thank You For Choosing Us!</p>
          <p className="text-xs font-semibold text-black mt-0.5">Please Proceed to Payment Counter</p>
        </div>
        
        <div className="border-t border-black pt-2 mt-2">
          <p className="text-xs italic">
            Questions? Ask our friendly staff!
          </p>
        </div>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center mt-2 mb-20 pt-2 border-t border-black">
          <p className="text-xs">
            Printed: {format(new Date(), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
      )}
    </div>
  );
}
