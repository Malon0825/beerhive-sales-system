/**
 * Reports Queries
 * Database queries for generating various reports
 */

import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * Get sales data by date range
 * 
 * Handles both POS orders (single order payment) and Tab orders (session-based payment)
 * For tabs, queries the order_sessions table to avoid counting each order separately
 * This prevents sales duplication for multi-order tabs
 */
export async function getSalesByDateRange(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // Get POS orders (no session - direct payment)
  const { data: posOrders, error: posError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_amount,
      subtotal,
      discount_amount,
      tax_amount,
      payment_method,
      status,
      completed_at,
      created_at,
      session_id,
      cashier:cashier_id(id, full_name),
      customer:customer_id(id, full_name, tier)
    `)
    .is('session_id', null)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (posError) throw posError;

  // Get closed sessions (tabs - group payment)
  const { data: sessions, error: sessionsError } = await supabase
    .from('order_sessions')
    .select(`
      id,
      session_number,
      total_amount,
      subtotal,
      discount_amount,
      tax_amount,
      closed_at,
      closed_by,
      table:restaurant_tables!order_sessions_table_id_fkey(id, table_number),
      customer:customers(id, full_name, tier),
      orders(
        payment_method,
        cashier_id
      )
    `)
    .eq('status', 'closed')
    .gte('closed_at', startDate)
    .lte('closed_at', endDate)
    .order('closed_at', { ascending: false });

  if (sessionsError) throw sessionsError;

  // Transform sessions to match order format for consistency
  const sessionOrders = sessions.map((session: any) => {
    // Get payment method and cashier from first order in session
    const firstOrder = session.orders?.[0];
    
    return {
      id: session.id,
      order_number: session.session_number,
      total_amount: session.total_amount,
      subtotal: session.subtotal,
      discount_amount: session.discount_amount,
      tax_amount: session.tax_amount,
      payment_method: firstOrder?.payment_method || null,
      status: 'completed',
      completed_at: session.closed_at,
      created_at: session.closed_at,
      cashier: firstOrder?.cashier_id ? { id: firstOrder.cashier_id, full_name: null } : null,
      customer: session.customer || null,
      is_session: true, // Flag to identify this as a session
      table: session.table,
    };
  });

  // Combine POS orders and session orders
  return [...posOrders, ...sessionOrders];
}

/**
 * Get daily sales summary
 */
export async function getDailySalesSummary(startDate: string, endDate: string) {
  // Aggregate sales data by date manually
  const orders = await getSalesByDateRange(startDate, endDate);
  
  // Group by date
  const dailyMap = new Map();
  orders.forEach((order: any) => {
    const date = order.completed_at.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        total_revenue: 0,
        transaction_count: 0,
        total_discounts: 0,
        unique_customers: new Set()
      });
    }
    const daily = dailyMap.get(date);
    daily.total_revenue += parseFloat(order.total_amount);
    daily.transaction_count += 1;
    daily.total_discounts += parseFloat(order.discount_amount || 0);
    if (order.customer?.id) {
      daily.unique_customers.add(order.customer.id);
    }
  });

  return Array.from(dailyMap.values()).map(d => ({
    ...d,
    unique_customers: d.unique_customers.size,
    average_transaction: d.total_revenue / d.transaction_count
  }));
}

/**
 * Get sales by hour (for peak hours analysis)
 * Handles both POS orders and closed sessions
 */
export async function getSalesByHour(date: string) {
  const supabase = supabaseAdmin;

  const startDate = `${date}T00:00:00`;
  const endDate = `${date}T23:59:59`;

  // Get POS orders
  const { data: posOrders, error: posError } = await supabase
    .from('orders')
    .select('completed_at, total_amount')
    .is('session_id', null)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (posError) throw posError;

  // Get closed sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('order_sessions')
    .select('closed_at, total_amount')
    .eq('status', 'closed')
    .gte('closed_at', startDate)
    .lte('closed_at', endDate);

  if (sessionsError) throw sessionsError;

  // Group by hour
  const hourlyMap = new Map();
  for (let hour = 0; hour < 24; hour++) {
    hourlyMap.set(hour, { hour, total_revenue: 0, transaction_count: 0 });
  }

  // Process POS orders
  posOrders.forEach((order: any) => {
    const hour = new Date(order.completed_at).getHours();
    const hourData = hourlyMap.get(hour)!;
    hourData.total_revenue += parseFloat(order.total_amount);
    hourData.transaction_count += 1;
  });

  // Process sessions
  sessions.forEach((session: any) => {
    const hour = new Date(session.closed_at).getHours();
    const hourData = hourlyMap.get(hour)!;
    hourData.total_revenue += parseFloat(session.total_amount);
    hourData.transaction_count += 1;
  });

  return Array.from(hourlyMap.values());
}

/**
 * Get top selling products
 */
export async function getTopProducts(startDate: string, endDate: string, limit = 10) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      item_name,
      quantity,
      total,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('product_id', 'is', null);

  if (error) throw error;

  // Aggregate by product
  const productMap = new Map();
  data.forEach((item: any) => {
    if (!item.order) return;
    
    const key = item.product_id;
    if (!productMap.has(key)) {
      productMap.set(key, {
        product_id: item.product_id,
        product_name: item.item_name,
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0
      });
    }
    const product = productMap.get(key);
    product.total_quantity += parseFloat(item.quantity);
    product.total_revenue += parseFloat(item.total);
    product.order_count += 1;
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}

/**
 * Get all products sold within a date range
 * Returns full aggregation without limiting results
 */
export async function getAllProductsSold(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      item_name,
      quantity,
      total,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('product_id', 'is', null);

  if (error) throw error;

  const productMap = new Map();
  data.forEach((item: any) => {
    if (!item.order) return;

    const key = item.product_id;
    if (!productMap.has(key)) {
      productMap.set(key, {
        product_id: item.product_id,
        product_name: item.item_name,
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0,
      });
    }
    const product = productMap.get(key);
    product.total_quantity += parseFloat(item.quantity);
    product.total_revenue += parseFloat(item.total);
    product.order_count += 1;
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

/**
 * Get all products and packages sold within a date range
 * Treats packages as standalone items and includes them alongside products
 */
export async function getAllProductsAndPackagesSold(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // 1) Direct product sales (reuse logic similar to getAllProductsSold)
  const { data: productItems, error: productError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      item_name,
      quantity,
      total,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('product_id', 'is', null);

  if (productError) throw productError;

  const byId: Map<string, { product_id: string; product_name: string; total_quantity: number; total_revenue: number; order_count: number; item_type: 'product' | 'package' }>
    = new Map();

  productItems.forEach((item: any) => {
    if (!item.order) return;
    const key = item.product_id as string;
    if (!byId.has(key)) {
      byId.set(key, {
        product_id: key,
        product_name: item.item_name,
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0,
        item_type: 'product',
      });
    }
    const acc = byId.get(key)!;
    acc.total_quantity += parseFloat(item.quantity);
    acc.total_revenue += parseFloat(item.total);
    acc.order_count += 1;
  });

  // 2) Package sales - treat as standalone items
  const { data: packageItems, error: packageError } = await supabase
    .from('order_items')
    .select(`
      package_id,
      item_name,
      quantity,
      total,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('package_id', 'is', null);

  if (packageError) throw packageError;

  packageItems.forEach((item: any) => {
    if (!item.order) return;
    const key = item.package_id as string;
    if (!byId.has(key)) {
      byId.set(key, {
        product_id: key, // Use package_id as identifier for list purposes
        product_name: item.item_name,
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0,
        item_type: 'package',
      });
    }
    const acc = byId.get(key)!;
    acc.total_quantity += parseFloat(item.quantity);
    acc.total_revenue += parseFloat(item.total);
    acc.order_count += 1;
  });

  return Array.from(byId.values()).sort((a, b) => b.total_revenue - a.total_revenue);
}

/**
 * Get combined product consumption: direct product sales + package component consumption
 * Revenue is intentionally not computed to avoid assumptions; consumers may hide revenue column.
 */
export async function getAllProductsSoldCombined(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // A) Direct product sales (quantities only)
  const { data: directData, error: directError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      item_name,
      quantity,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('product_id', 'is', null);

  if (directError) throw directError;

  const combined: Map<string, { product_id: string; product_name: string; total_quantity: number; total_revenue: number; order_count: number }>
    = new Map();

  directData.forEach((item: any) => {
    if (!item.order) return;
    const key = item.product_id as string;
    if (!combined.has(key)) {
      combined.set(key, {
        product_id: key,
        product_name: item.item_name,
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0,
      });
    }
    const acc = combined.get(key)!;
    acc.total_quantity += parseFloat(item.quantity);
    acc.order_count += 1;
  });

  // B) Package-derived consumption: expand packages into component products
  const { data: packageOrders, error: pkgErr } = await supabase
    .from('order_items')
    .select(`
      quantity,
      order:order_id(completed_at, status),
      package:packages!inner(
        id,
        name,
        items:package_items!inner(
          product_id,
          quantity,
          product:products(id, name)
        )
      )
    `)
    .not('package_id', 'is', null)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed');

  if (pkgErr) throw pkgErr;

  packageOrders?.forEach((orderItem: any) => {
    if (!orderItem.order) return;
    const packageQty = parseFloat(orderItem.quantity || '0');
    const pkg = orderItem.package;
    if (!pkg || !pkg.items) return;

    pkg.items.forEach((pkgItem: any) => {
      const productId = pkgItem.product_id as string;
      const perPackageQty = parseFloat(pkgItem.quantity || '0');
      const consumed = packageQty * perPackageQty;

      if (!combined.has(productId)) {
        combined.set(productId, {
          product_id: productId,
          product_name: pkgItem.product?.name || 'Unknown Product',
          total_quantity: 0,
          total_revenue: 0,
          order_count: 0,
        });
      }
      const acc = combined.get(productId)!;
      acc.total_quantity += consumed;
      // Count each package unit as a contributing order for this product
      acc.order_count += packageQty;
    });
  });

  return Array.from(combined.values()).sort((a, b) => b.total_quantity - a.total_quantity);
}

/**
 * Get sales by payment method
 * Handles both POS orders and closed sessions
 */
export async function getSalesByPaymentMethod(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // Get POS orders
  const { data: posOrders, error: posError } = await supabase
    .from('orders') 
    .select('payment_method, total_amount')
    .is('session_id', null)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (posError) throw posError;

  // Get closed sessions with payment method from first order
  const { data: sessions, error: sessionsError } = await supabase
    .from('order_sessions')
    .select(`
      total_amount,
      orders(payment_method)
    `)
    .eq('status', 'closed')
    .gte('closed_at', startDate)
    .lte('closed_at', endDate);

  if (sessionsError) throw sessionsError;

  // Aggregate by payment method
  const paymentMap = new Map();
  
  // Process POS orders
  posOrders.forEach((order: any) => {
    const method = order.payment_method || 'unknown';
    if (!paymentMap.has(method)) {
      paymentMap.set(method, { payment_method: method, total_amount: 0, count: 0 });
    }
    const payment = paymentMap.get(method);
    payment.total_amount += parseFloat(order.total_amount);
    payment.count += 1;
  });

  // Process sessions
  sessions.forEach((session: any) => {
    const method = session.orders?.[0]?.payment_method || 'unknown';
    if (!paymentMap.has(method)) {
      paymentMap.set(method, { payment_method: method, total_amount: 0, count: 0 });
    }
    const payment = paymentMap.get(method);
    payment.total_amount += parseFloat(session.total_amount);
    payment.count += 1;
  });

  return Array.from(paymentMap.values());
}

/**
 * Get sales by category
 */
export async function getSalesByCategory(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      total,
      quantity,
      product:product_id(
        category:category_id(id, name)
      ),
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed');

  if (error) throw error;

  // Aggregate by category
  const categoryMap = new Map();
  data.forEach((item: any) => {
    if (!item.order || !item.product?.category) return;
    
    const category = item.product.category;
    const key = category.id;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        category_id: category.id,
        category_name: category.name,
        total_revenue: 0,
        total_quantity: 0,
        order_count: 0
      });
    }
    const cat = categoryMap.get(key);
    cat.total_revenue += parseFloat(item.total);
    cat.total_quantity += parseFloat(item.quantity);
    cat.order_count += 1;
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

/**
 * Get sales by cashier
 * Handles both POS orders and closed sessions
 * For sessions, credits the cashier who closed the tab
 */
export async function getSalesByCashier(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // Get POS orders
  const { data: posOrders, error: posError } = await supabase
    .from('orders')
    .select(`
      total_amount,
      cashier:cashier_id(id, full_name)
    `)
    .is('session_id', null)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (posError) throw posError;

  // Get closed sessions with cashier from first order
  const { data: sessions, error: sessionsError } = await supabase
    .from('order_sessions')
    .select(`
      total_amount,
      orders(
        cashier:cashier_id(id, full_name)
      )
    `)
    .eq('status', 'closed')
    .gte('closed_at', startDate)
    .lte('closed_at', endDate);

  if (sessionsError) throw sessionsError;

  // Aggregate by cashier
  const cashierMap = new Map();
  
  // Process POS orders
  posOrders.forEach((order: any) => {
    if (!order.cashier) return;
    
    const key = order.cashier.id;
    if (!cashierMap.has(key)) {
      cashierMap.set(key, {
        cashier_id: order.cashier.id,
        cashier_name: order.cashier.full_name,
        total_sales: 0,
        transaction_count: 0
      });
    }
    const cashier = cashierMap.get(key);
    cashier.total_sales += parseFloat(order.total_amount);
    cashier.transaction_count += 1;
  });

  // Process sessions
  sessions.forEach((session: any) => {
    const cashierData = session.orders?.[0]?.cashier;
    if (!cashierData) return;
    
    const key = cashierData.id;
    if (!cashierMap.has(key)) {
      cashierMap.set(key, {
        cashier_id: cashierData.id,
        cashier_name: cashierData.full_name,
        total_sales: 0,
        transaction_count: 0
      });
    }
    const cashier = cashierMap.get(key);
    cashier.total_sales += parseFloat(session.total_amount);
    cashier.transaction_count += 1;
  });

  return Array.from(cashierMap.values())
    .map(c => ({
      ...c,
      average_transaction: c.total_sales / c.transaction_count
    }))
    .sort((a, b) => b.total_sales - a.total_sales);
}

/**
 * Get low stock items
 */
export async function getLowStockItems() {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      name,
      current_stock,
      reorder_point,
      reorder_quantity,
      unit_of_measure,
      category:category_id(name)
    `)
    .eq('is_active', true)
    .order('current_stock', { ascending: true });

  if (error) throw error;
  
  // Filter for low stock items (where current_stock <= reorder_point)
  return data.filter((product: any) => 
    (product.current_stock || 0) <= (product.reorder_point || 0)
  );
}

/**
 * Get voided transactions
 */
export async function getVoidedTransactions(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_amount,
      voided_reason,
      voided_at,
      created_at,
      cashier:cashier_id(full_name),
      voided_by_user:voided_by(full_name)
    `)
    .gte('voided_at', startDate)
    .lte('voided_at', endDate)
    .eq('status', 'voided')
    .order('voided_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get discount analysis
 */
export async function getDiscountAnalysis(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('discounts')
    .select(`
      discount_type,
      discount_value,
      discount_amount,
      reason,
      created_at,
      cashier:cashier_id(full_name),
      manager:manager_id(full_name)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  return data;
}

/**
 * Get customer visit frequency
 */
export async function getCustomerVisitFrequency(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('orders')
    .select(`
      customer:customer_id(id, full_name, tier),
      total_amount,
      completed_at
    `)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed')
    .not('customer_id', 'is', null);

  if (error) throw error;

  // Aggregate by customer
  const customerMap = new Map();
  data.forEach((order: any) => {
    if (!order.customer) return;
    
    const key = order.customer.id;
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customer_id: order.customer.id,
        customer_name: order.customer.full_name,
        tier: order.customer.tier,
        visit_count: 0,
        total_spent: 0
      });
    }
    const customer = customerMap.get(key);
    customer.visit_count += 1;
    customer.total_spent += parseFloat(order.total_amount);
  });

  return Array.from(customerMap.values())
    .map(c => ({
      ...c,
      average_order_value: c.total_spent / c.visit_count
    }))
    .sort((a, b) => b.total_spent - a.total_spent);
}

/**
 * Get inventory turnover data
 */
export async function getInventoryTurnover(startDate: string, endDate: string) {
  const supabase = supabaseAdmin;

  // Get products with their sales
  const { data: salesData, error: salesError } = await supabase
    .from('order_items')
    .select(`
      product_id,
      item_name,
      quantity,
      order:order_id(completed_at, status)
    `)
    .gte('order.completed_at', startDate)
    .lte('order.completed_at', endDate)
    .eq('order.status', 'completed')
    .not('product_id', 'is', null);

  if (salesError) throw salesError;

  // Get product stock levels
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, name, current_stock, cost_price')
    .eq('is_active', true);

  if (productsError) throw productsError;

  // Calculate turnover
  const productMap = new Map(products.map(p => [p.id, { ...p, quantity_sold: 0 }]));
  
  salesData.forEach((item: any) => {
    if (item.order && productMap.has(item.product_id)) {
      const product = productMap.get(item.product_id)!;
      product.quantity_sold += parseFloat(item.quantity);
    }
  });

  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return Array.from(productMap.values())
    .map(p => {
      const currentStock = p.current_stock || 0;
      const quantitySold = p.quantity_sold || 0;
      return {
        product_id: p.id,
        product_name: p.name,
        sku: p.sku,
        current_stock: currentStock,
        quantity_sold: quantitySold,
        turnover_rate: currentStock > 0 ? quantitySold / currentStock : 0,
        days_to_sell: quantitySold > 0 ? (currentStock / (quantitySold / daysDiff)) : null
      };
    })
    .sort((a, b) => (a.turnover_rate || 0) - (b.turnover_rate || 0));
}
