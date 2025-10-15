'use client';

import React from 'react';
import Image from 'next/image';
import { Order, OrderItem } from '@/models/entities/Order';
import { format } from 'date-fns';

/**
 * Order data structure with full details for receipt
 */
interface ReceiptOrderData {
  order: Order & {
    customer?: {
      full_name: string;
      customer_number: string;
    };
    cashier?: {
      full_name: string;
    };
    table?: {
      table_number: string;
    };
    order_items?: OrderItem[];
  };
}

interface PrintableReceiptProps {
  orderData: ReceiptOrderData;
  isPrintMode?: boolean;
}

/**
 * PrintableReceipt Component
 * Pure receipt content without modal wrapper for reliable printing
 * This component is designed to be printed directly without CSS conflicts
 * 
 * @param orderData - Complete order data with customer, cashier, table, and items
 * @param isPrintMode - If true, applies print-optimized styling
 */
export function PrintableReceipt({ orderData, isPrintMode = false }: PrintableReceiptProps) {
  const { order } = orderData;

  /**
   * Format date and time for display
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
    } catch {
      return dateString;
    }
  };

  /**
   * Format currency for display
   * @param amount - Amount to format
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  return (
    <div 
      className={`${isPrintMode ? 'print-receipt' : ''} bg-white`}
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
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <Image
            src="/receipt-logo.png"
            alt="BeerHive Receipt Logo"
            width={120}
            height={120}
            className="object-contain grayscale contrast-200"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-3xl font-bold tracking-wider mb-2 text-black" style={{ letterSpacing: '0.1em' }}>
          BEERHIVE PUB
        </h1>
        <p className="text-sm mb-1 text-black">Craft Beer & Great Food</p>
        <p className="text-xs text-black">Thank you for your visit!</p>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-5" />

      {/* Order Information */}
      <div className="mb-5">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-black font-semibold">Order #:</div>
          <div className="text-right font-bold">{order.order_number}</div>
          
          <div className="text-black">Date:</div>
          <div className="text-right">{formatDateTime(order.created_at)}</div>
          
          {order.cashier && (
            <>
              <div className="text-black">Cashier:</div>
              <div className="text-right">{order.cashier.full_name}</div>
            </>
          )}
          
          {order.table && (
            <>
              <div className="text-black">Table:</div>
              <div className="text-right font-semibold">Table {order.table.table_number}</div>
            </>
          )}
          
          {order.customer && (
            <>
              <div className="text-black">Customer:</div>
              <div className="text-right">{order.customer.full_name}</div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-5" />

      {/* Order Items */}
      <div className="mb-5">
        <h3 className="font-bold text-sm mb-4 text-center uppercase tracking-wide border-b-2 border-black pb-2">
          Order Items
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left pb-2 font-semibold">Item</th>
              <th className="text-center pb-2 font-semibold w-12">Qty</th>
              <th className="text-right pb-2 font-semibold w-20">Price</th>
              <th className="text-right pb-2 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr className="border-b border-black">
                  <td className="py-3 pr-2">{item.item_name}</td>
                  <td className="text-center py-3">{item.quantity}x</td>
                  <td className="text-right py-3">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right py-3 font-semibold">{formatCurrency(item.total)}</td>
                </tr>
                {item.notes && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pt-1 italic pl-2">
                      Note: {item.notes}
                    </td>
                  </tr>
                )}
                {item.is_vip_price && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pl-2 font-semibold uppercase">
                      VIP PRICE APPLIED
                    </td>
                  </tr>
                )}
                {item.is_complimentary && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pl-2 font-semibold uppercase">
                      COMPLIMENTARY ITEM
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-5" />

      {/* Totals */}
      <div className="mb-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-black">Subtotal:</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-medium">Discount:</span>
              <span className="font-semibold">-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-black">Tax:</span>
              <span className="font-medium">{formatCurrency(order.tax_amount)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-black mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold uppercase">Total:</span>
            <span className="text-2xl font-bold">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {order.payment_method && (
        <>
          <div className="border-t border-dashed border-black my-5" />
          <div className="mb-5">
            <h4 className="font-semibold text-sm mb-3 uppercase tracking-wide">Payment Details</h4>
            <div className="space-y-2 text-sm border border-black p-3 rounded">
              <div className="flex justify-between">
                <span className="text-black">Method:</span>
                <span className="font-semibold uppercase">{order.payment_method}</span>
              </div>
              {order.amount_tendered && (
                <div className="flex justify-between">
                  <span className="text-black">Tendered:</span>
                  <span className="font-medium">{formatCurrency(order.amount_tendered)}</span>
                </div>
              )}
              {order.change_amount !== null && order.change_amount > 0 && (
                <div className="flex justify-between border-t border-black pt-2 mt-2">
                  <span className="font-semibold text-black">Change:</span>
                  <span className="font-bold">{formatCurrency(order.change_amount)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-6" />

      {/* Footer Message */}
      <div className="text-center space-y-3 py-4">
        <div className="mb-3">
          <p className="text-base font-bold text-black">Thank You For Your Patronage!</p>
          <p className="text-sm font-semibold mt-1 text-black">Please Come Again!</p>
        </div>
        
        <div className="border-t border-gray-300 pt-3 mt-4">
          <p className="text-xs italic">
            This serves as your official receipt
          </p>

        </div>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center mt-4 mb-20 pt-3 border-t border-gray-200">
          <p className="text-xs">
            Printed: {format(new Date(), 'MMM dd, yyyy hh:mm a')}
          </p>
        </div>
      )}
    </div>
  );
}
