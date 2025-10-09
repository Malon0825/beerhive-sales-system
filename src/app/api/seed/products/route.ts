import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/seed/products
 * Idempotently seed product categories and products with image URLs for POS menu.
 *
 * Implementation details:
 * - Uses upsert() with onConflict to avoid duplicates (categories by name, products by sku)
 * - Re-reads category IDs by name to map into product.category_id
 * - Provides clear error responses to simplify debugging when a 500 occurs
 */
export async function POST(_request: NextRequest) {
  try {
    // ---- Step 1: Upsert categories ----
    const categories = [
      { name: 'Beer', description: 'Local and imported beers', color_code: '#f59e0b', default_destination: 'bartender', display_order: 1, is_active: true },
      { name: 'Cocktails', description: 'Mixed drinks and cocktails', color_code: '#a855f7', default_destination: 'bartender', display_order: 2, is_active: true },
      { name: 'Food', description: 'Pub food and snacks', color_code: '#10b981', default_destination: 'kitchen', display_order: 3, is_active: true },
      { name: 'Non-Alcoholic', description: 'Sodas, juices, and more', color_code: '#3b82f6', default_destination: 'bartender', display_order: 4, is_active: true },
    ];

    const categoryIdByName: Record<string, string> = {};
    for (const c of categories) {
      // Find by name
      const found = await supabaseAdmin
        .from('product_categories')
        .select('id')
        .eq('name', c.name)
        .maybeSingle();

      if (found.error && found.error.code !== 'PGRST116') {
        return NextResponse.json({ success: false, step: 'find_category', category: c.name, error: found.error.message }, { status: 500 });
      }

      if (found.data?.id) {
        // Update some fields to ensure consistency (optional)
        const upd = await supabaseAdmin
          .from('product_categories')
          .update({
            description: c.description,
            color_code: c.color_code,
            default_destination: c.default_destination as any,
            display_order: c.display_order,
            is_active: c.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', found.data.id);
        if (upd.error) {
          return NextResponse.json({ success: false, step: 'update_category', category: c.name, error: upd.error.message }, { status: 500 });
        }
        categoryIdByName[c.name] = found.data.id;
      } else {
        const ins = await supabaseAdmin
          .from('product_categories')
          .insert({
            name: c.name,
            description: c.description,
            color_code: c.color_code,
            default_destination: c.default_destination as any,
            display_order: c.display_order,
            is_active: c.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (ins.error) {
          return NextResponse.json({ success: false, step: 'insert_category', category: c.name, error: ins.error.message }, { status: 500 });
        }
        categoryIdByName[c.name] = ins.data.id;
      }
    }

    // ---- Step 2: Upsert products ----
    const products = [
      // Beer
      { sku: 'BEER-SANMIG-LG', name: 'San Mig Light (Bottle)', category: 'Beer', base_price: 150, vip_price: 140, stock: 120, uom: 'bottle', image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop' },
      { sku: 'BEER-REDHOR-STR', name: 'Red Horse (Stallion)', category: 'Beer', base_price: 200, vip_price: 185, stock: 80, uom: 'bottle', image_url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=600&auto=format&fit=crop' },
      { sku: 'BEER-HEINEKEN', name: 'Heineken', category: 'Beer', base_price: 180, vip_price: 170, stock: 60, uom: 'bottle', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop' },
      // Cocktails
      { sku: 'CKTL-MOJITO', name: 'Mojito', category: 'Cocktails', base_price: 260, vip_price: 240, stock: 40, uom: 'glass', image_url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=600&auto=format&fit=crop' },
      { sku: 'CKTL-MARG', name: 'Margarita', category: 'Cocktails', base_price: 280, vip_price: 260, stock: 35, uom: 'glass', image_url: 'https://images.unsplash.com/photo-1604908554027-70a4b74a3c5f?q=80&w=600&auto=format&fit=crop' },
      { sku: 'CKTL-OLD-FASH', name: 'Old Fashioned', category: 'Cocktails', base_price: 300, vip_price: 280, stock: 30, uom: 'glass', image_url: 'https://images.unsplash.com/photo-1572143480-9c43f83a0e4b?q=80&w=600&auto=format&fit=crop' },
      // Food
      { sku: 'FOOD-CHKN-1PC', name: '1 pc Chicken', category: 'Food', base_price: 90, vip_price: 85, stock: 200, uom: 'plate', image_url: 'https://images.unsplash.com/photo-1604908554045-977f103b57f7?q=80&w=600&auto=format&fit=crop' },
      { sku: 'FOOD-FRIES', name: 'French Fries', category: 'Food', base_price: 80, vip_price: 75, stock: 180, uom: 'basket', image_url: 'https://images.unsplash.com/photo-1541599188778-cdc73298e8f8?q=80&w=600&auto=format&fit=crop' },
      { sku: 'FOOD-NACHOS', name: 'Loaded Nachos', category: 'Food', base_price: 160, vip_price: 150, stock: 90, uom: 'platter', image_url: 'https://images.unsplash.com/photo-1617093727343-374698b8821a?q=80&w=600&auto=format&fit=crop' },
      // Non-Alcoholic
      { sku: 'NA-COLA-CAN', name: 'Cola (Can)', category: 'Non-Alcoholic', base_price: 60, vip_price: 55, stock: 150, uom: 'can', image_url: 'https://images.unsplash.com/photo-1600275669439-14e03c9f5c48?q=80&w=600&auto=format&fit=crop' },
      { sku: 'NA-ORANGE-J', name: 'Orange Juice', category: 'Non-Alcoholic', base_price: 70, vip_price: 65, stock: 120, uom: 'glass', image_url: 'https://images.unsplash.com/photo-1542444459-db63c7d3a3bd?q=80&w=600&auto=format&fit=crop' },
      { sku: 'NA-SPRK-WTR', name: 'Sparkling Water', category: 'Non-Alcoholic', base_price: 90, vip_price: 85, stock: 100, uom: 'bottle', image_url: 'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?q=80&w=600&auto=format&fit=crop' },
    ];

    const nowIso = new Date().toISOString();
    const productRows = products.map((p) => ({
      sku: p.sku,
      name: p.name,
      description: null,
      category_id: categoryIdByName[p.category],
      base_price: p.base_price,
      vip_price: p.vip_price,
      cost_price: null,
      current_stock: p.stock,
      unit_of_measure: p.uom,
      reorder_point: 10,
      reorder_quantity: 20,
      size_variant: null,
      alcohol_percentage: null,
      image_url: p.image_url,
      display_order: 0,
      is_active: true,
      is_featured: ['San Mig Light (Bottle)', 'Mojito', 'French Fries'].includes(p.name),
      barcode: null,
      created_by: null,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    // Upsert products by checking existing SKU first (works even without unique constraint)
    for (const row of productRows) {
      if (!row.category_id) {
        return NextResponse.json({ success: false, step: 'map_category', error: `Missing category id for mapped product ${row.name}` }, { status: 500 });
      }

      const found = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('sku', row.sku)
        .maybeSingle();

      if (found.error && found.error.code !== 'PGRST116') {
        return NextResponse.json({ success: false, step: 'find_product', sku: row.sku, error: found.error.message }, { status: 500 });
      }

      if (found.data?.id) {
        const upd = await supabaseAdmin
          .from('products')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', found.data.id);
        if (upd.error) {
          return NextResponse.json({ success: false, step: 'update_product', sku: row.sku, error: upd.error.message }, { status: 500 });
        }
      } else {
        const ins = await supabaseAdmin
          .from('products')
          .insert(row);
        if (ins.error) {
          return NextResponse.json({ success: false, step: 'insert_product', sku: row.sku, error: ins.error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Seed completed', categories: categories.length, products: products.length });
  } catch (error: any) {
    console.error('POST /api/seed/products error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to seed products' }, { status: 500 });
  }
}
