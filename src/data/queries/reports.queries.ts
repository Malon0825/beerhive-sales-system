/**
 * Reports Queries
 * Database queries for generating various reports
 */

import { createClient } from '@/data/supabase/client';

/**
 * Get sales data by date range
 */
export async function getSalesByDateRange(startDate: string, endDate: string) {
  const supabase = createClient();

  const { data, error } = await supabase
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
      cashier:cashier_id(id, full_name),
      customer:customer_id(id, full_name, tier)
    `)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get daily sales summary
 */
export async function getDailySalesSummary(startDate: string, endDate: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_daily_sales_summary', {
    start_date: startDate,
    end_date: endDate
  });

  if (error) {
    // Fallback to manual aggregation if RPC doesn't exist
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

  return data;
}

/**
 * Get sales by hour (for peak hours analysis)
 */
export async function getSalesByHour(date: string) {
  const supabase = createClient();

  const startDate = `${date}T00:00:00`;
  const endDate = `${date}T23:59:59`;

  const { data, error } = await supabase
    .from('orders')
    .select('completed_at, total_amount')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (error) throw error;

  // Group by hour
  const hourlyMap = new Map();
  for (let hour = 0; hour < 24; hour++) {
    hourlyMap.set(hour, { hour, total_revenue: 0, transaction_count: 0 });
  }

  data.forEach((order: any) => {
    const hour = new Date(order.completed_at).getHours();
    const hourData = hourlyMap.get(hour)!;
    hourData.total_revenue += parseFloat(order.total_amount);
    hourData.transaction_count += 1;
  });

  return Array.from(hourlyMap.values());
}

/**
 * Get top selling products
 */
export async function getTopProducts(startDate: string, endDate: string, limit = 10) {
  const supabase = createClient();

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
 * Get sales by payment method
 */
export async function getSalesByPaymentMethod(startDate: string, endDate: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('payment_method, total_amount')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (error) throw error;

  // Aggregate by payment method
  const paymentMap = new Map();
  data.forEach((order: any) => {
    const method = order.payment_method || 'unknown';
    if (!paymentMap.has(method)) {
      paymentMap.set(method, { payment_method: method, total_amount: 0, count: 0 });
    }
    const payment = paymentMap.get(method);
    payment.total_amount += parseFloat(order.total_amount);
    payment.count += 1;
  });

  return Array.from(paymentMap.values());
}

/**
 * Get sales by category
 */
export async function getSalesByCategory(startDate: string, endDate: string) {
  const supabase = createClient();

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
 */
export async function getSalesByCashier(startDate: string, endDate: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      total_amount,
      cashier:cashier_id(id, full_name)
    `)
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .eq('status', 'completed');

  if (error) throw error;

  // Aggregate by cashier
  const cashierMap = new Map();
  data.forEach((order: any) => {
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
  const supabase = createClient();

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
    .lte('current_stock', supabase.raw('reorder_point'))
    .eq('is_active', true)
    .order('current_stock', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get voided transactions
 */
export async function getVoidedTransactions(startDate: string, endDate: string) {
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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
    .map(p => ({
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      current_stock: p.current_stock,
      quantity_sold: p.quantity_sold,
      turnover_rate: p.current_stock > 0 ? p.quantity_sold / p.current_stock : 0,
      days_to_sell: p.quantity_sold > 0 ? (p.current_stock / (p.quantity_sold / daysDiff)) : null
    }))
    .sort((a, b) => (a.turnover_rate || 0) - (b.turnover_rate || 0));
}
