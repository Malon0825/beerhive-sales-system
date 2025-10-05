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
      className={`${isPrintMode ? 'print-receipt' : ''} bg-white font-mono text-sm`}
      style={isPrintMode ? { maxWidth: '80mm', margin: '0 auto', padding: '10mm' } : { padding: '1.5rem' }}
    >
      {/* Logo and Business Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 mb-3">
          <Image
            src="/beerhive-logo.png"
            alt="BeerHive Pub Logo"
            width={96}
            height={96}
            className="object-contain mx-auto"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-2xl font-bold text-center">BEERHIVE PUB</h1>
        <p className="text-xs text-gray-600 text-center mt-1">
          Craft Beer & Great Food
        </p>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300 my-4" />

      {/* Order Information */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span className="font-semibold">Order #:</span>
          <span>{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date:</span>
          <span>{formatDateTime(order.created_at)}</span>
        </div>
        {order.cashier && (
          <div className="flex justify-between">
            <span className="font-semibold">Cashier:</span>
            <span>{order.cashier.full_name}</span>
          </div>
        )}
        {order.table && (
          <div className="flex justify-between">
            <span className="font-semibold">Table:</span>
            <span>Table {order.table.table_number}</span>
          </div>
        )}
        {order.customer && (
          <div className="flex justify-between">
            <span className="font-semibold">Customer:</span>
            <span>{order.customer.full_name}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300 my-4" />

      {/* Order Items */}
      <div className="mb-4">
        <h3 className="font-bold mb-3 text-center">ORDER ITEMS</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2">Item</th>
              <th className="text-center pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr>
                  <td className="py-2">{item.item_name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
                {item.notes && (
                  <tr>
                    <td colSpan={4} className="text-xs text-gray-600 pb-2">
                      Note: {item.notes}
                    </td>
                  </tr>
                )}
                {item.is_vip_price && (
                  <tr>
                    <td colSpan={4} className="text-xs text-blue-600 pb-2">
                      * VIP Price Applied
                    </td>
                  </tr>
                )}
                {item.is_complimentary && (
                  <tr>
                    <td colSpan={4} className="text-xs text-green-600 pb-2">
                      * Complimentary Item
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300 my-4" />

      {/* Totals */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount:</span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}
        {order.tax_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>{formatCurrency(order.tax_amount)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between text-lg font-bold">
          <span>TOTAL:</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Payment Details */}
      {order.payment_method && (
        <>
          <div className="border-t-2 border-dashed border-gray-300 my-4" />
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="font-semibold">Payment Method:</span>
              <span className="uppercase">{order.payment_method}</span>
            </div>
            {order.amount_tendered && (
              <div className="flex justify-between">
                <span>Amount Tendered:</span>
                <span>{formatCurrency(order.amount_tendered)}</span>
              </div>
            )}
            {order.change_amount !== null && order.change_amount > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Change:</span>
                <span>{formatCurrency(order.change_amount)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300 my-4" />

      {/* Footer Message */}
      <div className="text-center space-y-2 mt-6">
        <p className="text-xs">Thank you for your patronage!</p>
        <p className="text-xs font-semibold">Please come again!</p>
        <p className="text-xs text-gray-600 mt-3">
          This serves as your official receipt
        </p>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center mt-6 text-xs text-gray-500">
          Printed: {format(new Date(), 'MMM dd, yyyy hh:mm a')}
        </div>
      )}
    </div>
  );
}
