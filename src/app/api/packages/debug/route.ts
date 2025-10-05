import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * DEBUG ENDPOINT - Check package data in database
 * GET /api/packages/debug
 */
export async function GET(request: NextRequest) {
  try {
    // Check packages
    const { data: packages, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('id, name, package_code, is_active, valid_from, valid_until')
      .order('created_at', { ascending: false })
      .limit(5);

    if (pkgError) throw pkgError;

    // Check package_items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('package_items')
      .select('id, package_id, product_id, quantity')
      .limit(10);

    if (itemsError) throw itemsError;

    // Check if any packages have items
    const { data: packagesWithItems, error: joinError } = await supabaseAdmin
      .from('packages')
      .select(`
        id,
        name,
        is_active,
        items:package_items(id, product_id, quantity)
      `)
      .limit(5);

    if (joinError) throw joinError;

    // Get active packages (what POS uses)
    const today = new Date().toISOString().split('T')[0];
    const { data: activePackages, error: activeError } = await supabaseAdmin
      .from('packages')
      .select(`
        id,
        name,
        is_active,
        valid_from,
        valid_until,
        items:package_items(
          id,
          product_id,
          quantity,
          product:products(id, name, base_price)
        )
      `)
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${today}`)
      .or(`valid_until.is.null,valid_until.gte.${today}`);

    if (activeError) throw activeError;

    return NextResponse.json({
      success: true,
      debug: {
        total_packages: packages?.length || 0,
        packages: packages || [],
        total_package_items: items?.length || 0,
        package_items: items || [],
        packages_with_items_joined: packagesWithItems || [],
        active_packages_for_pos: activePackages || [],
        today_date: today,
      },
      message: 'Debug information retrieved successfully'
    });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error
    }, { status: 500 });
  }
}
