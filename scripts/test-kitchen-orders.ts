/**
 * Test Kitchen Orders Script
 * Tests the kitchen order routing functionality
 * 
 * Usage: npx tsx scripts/test-kitchen-orders.ts
 */

import { supabaseAdmin } from '../src/data/supabase/server-client';

async function testKitchenOrders() {
  console.log('🔍 Testing Kitchen Order System\n');

  // 1. Check if kitchen_orders table exists
  console.log('1️⃣ Checking kitchen_orders table...');
  const { data: kitchenOrders, error: koError } = await supabaseAdmin
    .from('kitchen_orders')
    .select('*')
    .limit(5);

  if (koError) {
    console.error('❌ Error fetching kitchen_orders:', koError.message);
  } else {
    console.log(`✅ Found ${kitchenOrders?.length || 0} kitchen orders`);
    if (kitchenOrders && kitchenOrders.length > 0) {
      console.log('   Sample kitchen order:', {
        id: kitchenOrders[0].id,
        order_id: kitchenOrders[0].order_id,
        destination: kitchenOrders[0].destination,
        status: kitchenOrders[0].status,
      });
    }
  }
  console.log('');

  // 2. Check product categories
  console.log('2️⃣ Checking product categories...');
  const { data: categories, error: catError } = await supabaseAdmin
    .from('product_categories')
    .select('id, name, default_destination');

  if (catError) {
    console.error('❌ Error fetching categories:', catError.message);
  } else {
    console.log(`✅ Found ${categories?.length || 0} categories`);
    if (categories) {
      categories.forEach((cat: any) => {
        console.log(`   - ${cat.name}: ${cat.default_destination || '⚠️  NOT SET'}`);
      });
    }
  }
  console.log('');

  // 3. Check products with categories
  console.log('3️⃣ Checking products...');
  const { data: products, error: prodError } = await supabaseAdmin
    .from('products')
    .select(`
      id,
      name,
      category:product_categories(name, default_destination)
    `)
    .limit(10);

  if (prodError) {
    console.error('❌ Error fetching products:', prodError.message);
  } else {
    console.log(`✅ Found ${products?.length || 0} products`);
    if (products) {
      products.forEach((prod: any) => {
        console.log(`   - ${prod.name}:`);
        console.log(`     Category: ${prod.category?.name || 'NO CATEGORY'}`);
        console.log(`     Destination: ${prod.category?.default_destination || '⚠️  NOT SET'}`);
      });
    }
  }
  console.log('');

  // 4. Check recent orders
  console.log('4️⃣ Checking recent orders...');
  const { data: orders, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      order_number,
      created_at,
      order_items(id, item_name, product_id)
    `)
    .order('created_at', { ascending: false })
    .limit(3);

  if (orderError) {
    console.error('❌ Error fetching orders:', orderError.message);
  } else {
    console.log(`✅ Found ${orders?.length || 0} recent orders`);
    if (orders && orders.length > 0) {
      for (const order of orders) {
        console.log(`\n   Order ${order.order_number}:`);
        console.log(`   - Created: ${order.created_at}`);
        console.log(`   - Items: ${order.order_items?.length || 0}`);
        
        // Check if kitchen orders were created for this order
        const { data: ko } = await supabaseAdmin
          .from('kitchen_orders')
          .select('id, destination, status')
          .eq('order_id', order.id);
        
        console.log(`   - Kitchen Orders: ${ko?.length || 0}`);
        if (ko && ko.length > 0) {
          ko.forEach((k: any) => {
            console.log(`     • ${k.destination}: ${k.status}`);
          });
        } else {
          console.log('     ⚠️  NO KITCHEN ORDERS CREATED!');
        }
      }
    }
  }
  console.log('\n');

  // 5. Summary and recommendations
  console.log('📋 Summary & Recommendations:');
  console.log('─────────────────────────────────────');
  
  if (!categories || categories.length === 0) {
    console.log('⚠️  No product categories found');
    console.log('   → Run: npm run seed');
  } else if (categories.every((c: any) => !c.default_destination)) {
    console.log('⚠️  Categories exist but default_destination not set');
    console.log('   → Need to update categories with default_destination');
  }

  if (!products || products.length === 0) {
    console.log('⚠️  No products found');
    console.log('   → Run: npm run seed');
  }

  if (!orders || orders.length === 0) {
    console.log('ℹ️  No orders found');
    console.log('   → Create a test order from the POS');
  } else if (orders && !kitchenOrders?.length) {
    console.log('⚠️  Orders exist but no kitchen orders were created');
    console.log('   → Kitchen routing may not be working');
    console.log('   → Check CreateOrder.ts line 136');
  }

  console.log('\n✅ Test complete!');
}

// Run the test
testKitchenOrders()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
