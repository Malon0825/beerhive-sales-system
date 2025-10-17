import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/data/repositories/InventoryRepository';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { AppError } from '@/lib/errors/AppError';
import { supabaseAdmin } from '@/data/supabase/server-client';

/**
 * POST /api/inventory/adjust
 * Adjust product stock with proper movement type enforcement
 * 
 * Movement Types:
 * - stock_in: Increase inventory (quantity_change must be positive)
 * - stock_out: Decrease inventory (quantity_change must be negative)
 * - physical_count: Set to exact count (quantity_change is the difference)
 * - sale: Auto-deduction from sales (quantity_change must be negative)
 * - void_return: Return from voided order (quantity_change must be positive)
 * 
 * Note: 'transfer' is not supported as system doesn't have multi-location infrastructure
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.product_id || body.quantity_change === undefined || !body.movement_type || !body.reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure quantity_change is a number
    const quantityChange = parseFloat(body.quantity_change);
    if (isNaN(quantityChange)) {
      return NextResponse.json(
        { success: false, error: 'Invalid quantity change' },
        { status: 400 }
      );
    }

    // Validate movement type is supported (removed 'transfer' as system doesn't support multi-location)
    const validMovementTypes = ['stock_in', 'stock_out', 'physical_count', 'sale', 'void_return'];
    if (!validMovementTypes.includes(body.movement_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid movement type. Supported types: ${validMovementTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate movement type consistency with quantity direction
    // Stock In should have positive quantity_change
    // Stock Out should have negative quantity_change
    // Physical Count can be any value (represents difference)
    if (body.movement_type === 'stock_in' && quantityChange < 0) {
      return NextResponse.json(
        { success: false, error: 'Stock In movement must have positive quantity change' },
        { status: 400 }
      );
    }
    if (body.movement_type === 'stock_out' && quantityChange > 0) {
      return NextResponse.json(
        { success: false, error: 'Stock Out movement must have negative quantity change' },
        { status: 400 }
      );
    }

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    let userRole: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      // Verify token and get user
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        
        // Get user role from users table
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          userRole = userData.role;
        }
      }
    }

    // Get current product stock using the server-side Supabase admin client
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('current_stock')
      .eq('id', body.product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const currentStock = product.current_stock ?? 0;

    // Validate adjustment
    const validation = InventoryService.validateAdjustment(
      currentStock,
      quantityChange,
      body.movement_type
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Check if requires manager approval
    const requiresApproval = InventoryService.requiresManagerApproval(
      currentStock,
      quantityChange
    );

    // Auto-approve if current user is manager or admin
    const isManagerOrAdmin = userRole === 'manager' || userRole === 'admin';
    const hasManagerApproval = body.manager_approved || isManagerOrAdmin;

    if (requiresApproval && !hasManagerApproval) {
      return NextResponse.json(
        {
          success: false,
          error: 'This adjustment requires manager approval',
          requiresApproval: true,
        },
        { status: 403 }
      );
    }

    // Perform adjustment (use 'system' as fallback if no authenticated user)
    const result = await InventoryRepository.adjustStock(
      body.product_id,
      quantityChange,
      body.movement_type,
      body.reason,
      userId || 'system',
      body.notes,
      body.unit_cost
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Stock adjusted successfully',
      warning: validation.error,
    });
  } catch (error) {
    console.error('Adjust stock error:', error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
