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
   * @param orderId - The ID of the order to generate receipt for
   * @param settings - Optional business settings override
   * @returns Receipt data formatted for printing
   */
  static async generateReceipt(orderId: string, settings?: any): Promise<ReceiptData> {
    console.log(`📄 [ReceiptGenerator] Generating receipt for order: ${orderId}`);
    
    // Fetch order data using admin client (bypasses RLS for server-side operations)
    const { supabaseAdmin } = await import('@/data/supabase/server-client');
    
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        customer:customer_id(full_name, tier),
        table:table_id(table_number),
        order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('❌ [ReceiptGenerator] Database error:', error);
      throw new Error(`Order not found: ${error.message}`);
    }
    
    if (!order) {
      console.error('❌ [ReceiptGenerator] Order not found in database:', orderId);
      throw new Error(`Order not found with ID: ${orderId}`);
    }
    
    console.log(`✅ [ReceiptGenerator] Order found:`, {
      order_number: order.order_number,
      status: order.status,
      items_count: order.order_items?.length || 0
    });

    // Get cashier info separately
    let cashier = null;
    if (order.cashier_id) {
      const result = await supabaseAdmin
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
   * Uses admin client to bypass RLS for server-side operations
   */
  private static async getBusinessSettings() {
    try {
      const { supabaseAdmin } = await import('@/data/supabase/server-client');
      
      const { data } = await supabaseAdmin
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
   * Includes logo, enhanced styling, and print-optimized CSS
   */
  static generateHTMLReceipt(data: ReceiptData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${data.orderNumber}</title>
  <style>
    /* Print-specific styles */
    @media print {
      @page { 
        margin: 0;
        size: 80mm auto;
      }
      body { 
        margin: 0;
        padding: 0;
      }
      /* Ensure all elements print */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
    
    /* Base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8mm;
      padding-bottom: 14mm;
      background: white;
      color: #000;
    }
    
    /* Logo container */
    .logo-container {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .logo {
      width: 100px;
      height: 100px;
      margin: 0 auto 10px;
      display: block;
      filter: grayscale(100%) contrast(200%);
    }
    
    /* Header styles */
    .header {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .business-name {
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    
    .business-info {
      font-size: 10px;
      color: #000;
      line-height: 1.4;
    }
    
    /* Dividers */
    .divider {
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    
    .thick-divider {
      border-top: 2px solid #000;
      margin: 10px 0;
    }
    
    .double-divider {
      border-top: 3px double #000;
      margin: 10px 0;
    }
    
    /* Order info section */
    .order-info {
      margin: 15px 0;
      font-size: 11px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }
    
    .info-label {
      color: #333;
    }
    
    .info-value {
      font-weight: 600;
      text-align: right;
    }
    
    /* Items section */
    .items-section {
      margin: 15px 0;
    }
    
    .items-header {
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
      padding-bottom: 8px;
      border-bottom: 2px solid #000;
      margin-bottom: 10px;
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 11px;
    }
    
    .item-details {
      flex: 1;
      padding-right: 10px;
    }
    
    .item-name {
      font-weight: 500;
    }
    
    .item-price {
      white-space: nowrap;
      font-weight: 600;
    }
    
    .item-note {
      font-size: 9px;
      color: #000;
      font-style: italic;
      margin-left: 15px;
      margin-top: 2px;
    }
    
    .item-badge {
      font-size: 9px;
      font-weight: bold;
      margin-left: 15px;
      margin-top: 2px;
      color: #000;
    }
    
    /* Totals section */
    .totals-section {
      margin: 15px 0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 11px;
    }
    
    .total-label {
      color: #333;
    }
    
    .total-value {
      font-weight: 500;
    }
    
    .discount-row {
      color: #000;
      font-weight: 600;
    }
    
    .grand-total {
      font-size: 14px;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    
    /* Payment section */
    .payment-section {
      margin: 15px 0;
      padding: 10px;
      border: 1px solid #000;
      border-radius: 3px;
    }
    
    .payment-title {
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    
    .payment-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: 11px;
    }
    
    .payment-method {
      text-transform: uppercase;
      font-weight: bold;
    }
    
    .change-row {
      font-weight: bold;
      color: #000;
      padding-top: 6px;
      margin-top: 6px;
      border-top: 1px solid #000;
    }
    
    /* Footer section */
    .footer {
      text-align: center;
      margin-top: 20px;
    }
    
    .footer-message {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .footer-submessage {
      font-size: 10px;
      font-weight: 600;
      color: #000;
      margin-bottom: 10px;
    }
    
    .footer-info {
      font-size: 9px;
      color: #000;
      font-style: italic;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #000;
    }
    
    .powered-by {
      font-size: 8px;
      color: #000;
      margin-top: 5px;
    }
    
    /* Print timestamp */
    .print-timestamp {
      text-align: center;
      font-size: 8px;
      color: #000;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #000;
    }
  </style>
</head>
<body>
  <!-- Logo -->
  <div class="logo-container">
    <img src="/receipt-logo.png" alt="Receipt Logo" class="logo" onerror="this.style.display='none'">
  </div>
  
  <!-- Business Header -->
  <div class="header">
    <div class="business-name">${data.businessName.toUpperCase()}</div>
    <div class="business-info">
      ${data.businessAddress ? `${data.businessAddress}<br>` : ''}
      ${data.businessPhone ? `${data.businessPhone}<br>` : ''}
      ${data.businessEmail ? `${data.businessEmail}<br>` : ''}
      Craft Beer &amp; Great Food
    </div>
  </div>
  
  <div class="double-divider"></div>
  
  <!-- Order Information -->
  <div class="order-info">
    <div class="info-row">
      <span class="info-label">Order #:</span>
      <span class="info-value">${data.orderNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span class="info-value">${format(data.orderDate, 'MMM dd, yyyy HH:mm')}</span>
    </div>
    ${data.tableNumber ? `
    <div class="info-row">
      <span class="info-label">Table:</span>
      <span class="info-value">Table ${data.tableNumber}</span>
    </div>` : ''}
    ${data.customerName ? `
    <div class="info-row">
      <span class="info-label">Customer:</span>
      <span class="info-value">${data.customerName}${data.customerTier && data.customerTier !== 'regular' ? ` (${data.customerTier.toUpperCase()})` : ''}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">Cashier:</span>
      <span class="info-value">${data.cashierName}</span>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <!-- Order Items -->
  <div class="items-section">
    <div class="items-header">Order Items</div>
    ${data.items.map(item => `
      <div class="item-row">
        <div class="item-details">
          <div class="item-name">${item.quantity}x ${item.name}</div>
          ${item.notes ? `<div class="item-note">ⓘ Note: ${item.notes}</div>` : ''}
          ${item.isComplimentary ? `<div class="item-badge complimentary">✓ COMPLIMENTARY</div>` : ''}
        </div>
        <div class="item-price">${this.formatCurrency(item.total)}</div>
      </div>
    `).join('')}
  </div>
  
  <div class="divider"></div>
  
  <!-- Totals -->
  <div class="totals-section">
    <div class="total-row">
      <span class="total-label">Subtotal:</span>
      <span class="total-value">${this.formatCurrency(data.subtotal)}</span>
    </div>
    ${data.discountAmount > 0 ? `
    <div class="total-row discount-row">
      <span class="total-label">Discount:</span>
      <span class="total-value">-${this.formatCurrency(data.discountAmount)}</span>
    </div>` : ''}
    ${data.taxAmount > 0 ? `
    <div class="total-row">
      <span class="total-label">Tax:</span>
      <span class="total-value">${this.formatCurrency(data.taxAmount)}</span>
    </div>` : ''}
    
    <div class="total-row grand-total">
      <span>TOTAL:</span>
      <span>${this.formatCurrency(data.totalAmount)}</span>
    </div>
  </div>
  
  <div class="thick-divider"></div>
  
  <!-- Payment Details -->
  ${data.paymentMethod ? `
  <div class="payment-section">
    <div class="payment-title">Payment Details</div>
    <div class="payment-row">
      <span>Method:</span>
      <span class="payment-method">${data.paymentMethod}</span>
    </div>
    ${data.amountTendered ? `
    <div class="payment-row">
      <span>Tendered:</span>
      <span>${this.formatCurrency(data.amountTendered)}</span>
    </div>` : ''}
    ${data.changeAmount !== null && data.changeAmount !== undefined && data.changeAmount > 0 ? `
    <div class="payment-row change-row">
      <span>Change:</span>
      <span>${this.formatCurrency(data.changeAmount)}</span>
    </div>` : ''}
  </div>` : ''}
  
  <div class="double-divider"></div>
  
  <!-- Footer -->
  <div class="footer">
    <div class="footer-message">Thank You For Your Patronage!</div>
    <div class="footer-submessage">Please Come Again!</div>
    <div class="footer-info">
      ${data.footerMessage || 'This serves as your official receipt'}<br>
    </div>
    <div class="powered-by">Powered by BeerHive POS</div>
  </div>
  
  <!-- Print Timestamp -->
  <div class="print-timestamp">
    Printed: ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}
  </div>
</body>
</html>
    `.trim();
  }
}
