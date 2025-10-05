/**
 * Receipt Generator Utility
 * Formats order data for receipt printing and PDF generation
 */

import { format } from 'date-fns';

export interface ReceiptData {
  // Business Information
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail?: string;
  
  // Order Information
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  
  // Table Information
  tableNumber?: string;
  
  // Customer Information
  customerName?: string;
  customerTier?: string;
  
  // Cashier Information
  cashierName: string;
  
  // Items
  items: ReceiptItem[];
  
  // Pricing
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  
  // Payment
  paymentMethod: string;
  amountTendered?: number;
  changeAmount?: number;
  
  // Additional Info
  notes?: string;
  footerMessage?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  total: number;
  notes?: string;
  isComplimentary?: boolean;
  addons?: string[];
}

export class ReceiptGenerator {
  /**
   * Generate receipt data from order
   */
  static async generateReceipt(orderId: string, settings?: any): Promise<ReceiptData> {
    // Fetch order data
    const { supabase } = await import('@/data/supabase/client');
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id(full_name, tier),
        table:table_id(table_number),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new Error('Order not found');
    }

    // Get cashier info separately
    let cashier = null;
    if (order.cashier_id) {
      const result = await supabase
        .from('users')
        .select('full_name')
        .eq('id', order.cashier_id)
        .single();
      cashier = result.data;
    }

    // Get business settings
    const businessSettings = settings || await this.getBusinessSettings();

    // Format items
    const items: ReceiptItem[] = (order.order_items || []).map((item: any) => ({
      name: item.item_name || 'Unknown Item',
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unit_price.toString()),
      subtotal: parseFloat(item.subtotal.toString()),
      discount: item.discount_amount ? parseFloat(item.discount_amount.toString()) : 0,
      total: parseFloat(item.total.toString()),
      notes: item.notes || undefined,
      isComplimentary: item.is_complimentary || false,
      addons: [], // TODO: Fetch addons if needed
    }));

    return {
      businessName: businessSettings.businessName || 'BeerHive PUB',
      businessAddress: businessSettings.businessAddress || '',
      businessPhone: businessSettings.businessPhone || '',
      businessEmail: businessSettings.businessEmail || '',
      orderId: order.id,
      orderNumber: order.order_number,
      orderDate: new Date(order.created_at || new Date()),
      tableNumber: order.table?.table_number || undefined,
      customerName: order.customer?.full_name || undefined,
      customerTier: order.customer?.tier || undefined,
      cashierName: cashier?.full_name || 'Unknown',
      items,
      subtotal: parseFloat(order.subtotal.toString()),
      discountAmount: parseFloat((order.discount_amount || 0).toString()),
      taxAmount: parseFloat((order.tax_amount || 0).toString()),
      totalAmount: parseFloat(order.total_amount.toString()),
      paymentMethod: order.payment_method || 'Cash',
      amountTendered: order.amount_tendered ? parseFloat(order.amount_tendered.toString()) : undefined,
      changeAmount: order.change_amount ? parseFloat(order.change_amount.toString()) : undefined,
      notes: order.order_notes || undefined,
      footerMessage: businessSettings.receiptFooter || 'Thank you for your patronage!',
    };
  }

  /**
   * Get business settings for receipt
   */
  private static async getBusinessSettings() {
    try {
      const { supabase } = await import('@/data/supabase/client');
      
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', [
          'business_name',
          'business_address',
          'business_phone',
          'business_email',
          'receipt_footer',
        ]);

      const settings: any = {};
      data?.forEach((setting: any) => {
        const key = setting.key.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
        const formattedKey = key.charAt(0).toLowerCase() + key.slice(1);
        settings[formattedKey] = setting.value;
      });

      return settings;
    } catch (error) {
      console.error('Failed to fetch business settings:', error);
      return {};
    }
  }

  /**
   * Format receipt data for printing
   */
  static formatReceiptData(data: ReceiptData): string {
    const lines: string[] = [];
    const width = 42; // Standard thermal printer width (characters)

    // Center text helper
    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    // Header
    lines.push(center(data.businessName.toUpperCase()));
    if (data.businessAddress) lines.push(center(data.businessAddress));
    if (data.businessPhone) lines.push(center(data.businessPhone));
    if (data.businessEmail) lines.push(center(data.businessEmail));
    lines.push('='.repeat(width));

    // Order Info
    lines.push(`Order #: ${data.orderNumber}`);
    lines.push(`Date: ${format(data.orderDate, 'MMM dd, yyyy HH:mm')}`);
    if (data.tableNumber) lines.push(`Table: ${data.tableNumber}`);
    if (data.customerName) {
      lines.push(`Customer: ${data.customerName}${data.customerTier && data.customerTier !== 'regular' ? ` (${data.customerTier.toUpperCase()})` : ''}`);
    }
    lines.push(`Cashier: ${data.cashierName}`);
    lines.push('-'.repeat(width));

    // Items
    lines.push('QTY  ITEM                    AMOUNT');
    lines.push('-'.repeat(width));
    
    data.items.forEach(item => {
      const qty = item.quantity.toString().padEnd(5);
      const amount = this.formatCurrency(item.total).padStart(10);
      const maxNameLength = width - 16;
      const name = item.name.substring(0, maxNameLength).padEnd(maxNameLength);
      
      lines.push(`${qty}${name}${amount}`);
      
      if (item.notes) {
        lines.push(`     Note: ${item.notes}`);
      }
      if (item.isComplimentary) {
        lines.push(`     ** COMPLIMENTARY **`);
      }
    });

    lines.push('-'.repeat(width));

    // Totals
    const formatTotalLine = (label: string, amount: number) => {
      return `${label.padEnd(width - 10)}${this.formatCurrency(amount).padStart(10)}`;
    };

    lines.push(formatTotalLine('Subtotal:', data.subtotal));
    
    if (data.discountAmount > 0) {
      lines.push(formatTotalLine('Discount:', -data.discountAmount));
    }
    
    if (data.taxAmount > 0) {
      lines.push(formatTotalLine('Tax:', data.taxAmount));
    }
    
    lines.push('='.repeat(width));
    lines.push(formatTotalLine('TOTAL:', data.totalAmount));
    lines.push('='.repeat(width));

    // Payment
    lines.push('');
    lines.push(`Payment Method: ${data.paymentMethod.toUpperCase()}`);
    
    if (data.amountTendered) {
      lines.push(formatTotalLine('Tendered:', data.amountTendered));
      if (data.changeAmount) {
        lines.push(formatTotalLine('Change:', data.changeAmount));
      }
    }

    // Footer
    lines.push('');
    lines.push('-'.repeat(width));
    if (data.footerMessage) {
      lines.push(center(data.footerMessage));
    }
    lines.push(center('Powered by BeerHive POS'));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Calculate totals from items
   */
  static calculateTotals(items: ReceiptItem[]): {
    subtotal: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);

    return { subtotal, total };
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Generate HTML receipt for browser printing
   */
  static generateHTMLReceipt(data: ReceiptData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${data.orderNumber}</title>
  <style>
    @media print {
      @page { margin: 0; }
      body { margin: 0; }
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      max-width: 80mm;
      margin: 0 auto;
      padding: 5mm;
    }
    
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .header { font-size: 14px; margin-bottom: 10px; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .thick-divider { border-top: 2px solid #000; margin: 5px 0; }
    .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .total-row { display: flex; justify-content: space-between; font-weight: bold; }
    .footer { margin-top: 10px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="center header bold">
    ${data.businessName.toUpperCase()}
  </div>
  ${data.businessAddress ? `<div class="center">${data.businessAddress}</div>` : ''}
  ${data.businessPhone ? `<div class="center">${data.businessPhone}</div>` : ''}
  ${data.businessEmail ? `<div class="center">${data.businessEmail}</div>` : ''}
  
  <div class="thick-divider"></div>
  
  <div>Order #: ${data.orderNumber}</div>
  <div>Date: ${format(data.orderDate, 'MMM dd, yyyy HH:mm')}</div>
  ${data.tableNumber ? `<div>Table: ${data.tableNumber}</div>` : ''}
  ${data.customerName ? `<div>Customer: ${data.customerName}${data.customerTier && data.customerTier !== 'regular' ? ` (${data.customerTier.toUpperCase()})` : ''}</div>` : ''}
  <div>Cashier: ${data.cashierName}</div>
  
  <div class="divider"></div>
  
  ${data.items.map(item => `
    <div class="item-row">
      <div>${item.quantity}x ${item.name}</div>
      <div>${this.formatCurrency(item.total)}</div>
    </div>
    ${item.notes ? `<div style="padding-left: 20px; font-size: 10px;">Note: ${item.notes}</div>` : ''}
    ${item.isComplimentary ? `<div style="padding-left: 20px; font-weight: bold;">** COMPLIMENTARY **</div>` : ''}
  `).join('')}
  
  <div class="divider"></div>
  
  <div class="item-row">
    <div>Subtotal:</div>
    <div>${this.formatCurrency(data.subtotal)}</div>
  </div>
  ${data.discountAmount > 0 ? `
  <div class="item-row">
    <div>Discount:</div>
    <div>-${this.formatCurrency(data.discountAmount)}</div>
  </div>` : ''}
  ${data.taxAmount > 0 ? `
  <div class="item-row">
    <div>Tax:</div>
    <div>${this.formatCurrency(data.taxAmount)}</div>
  </div>` : ''}
  
  <div class="thick-divider"></div>
  
  <div class="total-row">
    <div>TOTAL:</div>
    <div>${this.formatCurrency(data.totalAmount)}</div>
  </div>
  
  <div class="thick-divider"></div>
  
  <div style="margin-top: 10px;">
    <div>Payment: ${data.paymentMethod.toUpperCase()}</div>
    ${data.amountTendered ? `<div>Tendered: ${this.formatCurrency(data.amountTendered)}</div>` : ''}
    ${data.changeAmount ? `<div>Change: ${this.formatCurrency(data.changeAmount)}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <div class="center footer">
    ${data.footerMessage || 'Thank you for your patronage!'}
  </div>
  <div class="center footer">
    Powered by BeerHive POS
  </div>
</body>
</html>
    `.trim();
  }
}
