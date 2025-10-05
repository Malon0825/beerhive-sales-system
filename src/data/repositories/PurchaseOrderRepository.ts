import { supabase } from '../supabase/client';
import { AppError } from '@/lib/errors/AppError';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_by: string | null;
  approved_by: string | null;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

export interface CreatePurchaseOrderInput {
  supplier_id: string;
  order_date: string;
  expected_delivery_date?: string;
  items: Array<{
    product_id: string;
    quantity_ordered: number;
    unit_cost: number;
  }>;
  notes?: string;
}

/**
 * PurchaseOrderRepository
 * Data access layer for purchase order management
 */
export class PurchaseOrderRepository {
  /**
   * Generate unique PO number
   */
  private static async generatePONumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const { count, error } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-${month}-01`)
      .lt('created_at', `${year}-${parseInt(month) + 1}-01`);

    if (error) {
      throw new AppError('Failed to generate PO number', 500);
    }

    const nextNumber = (count || 0) + 1;
    return `PO${year}${month}${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Get all purchase orders
   */
  static async getAll(filters?: {
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PurchaseOrder[]> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(id, supplier_code, name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('order_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('order_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new AppError(`Failed to fetch purchase orders: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get all purchase orders error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch purchase orders', 500);
    }
  }

  /**
   * Get purchase order by ID
   */
  static async getById(id: string): Promise<(PurchaseOrder & { items: PurchaseOrderItem[] }) | null> {
    try {
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(id, supplier_code, name)
        `)
        .eq('id', id)
        .single();

      if (poError) {
        if (poError.code === 'PGRST116') return null;
        throw new AppError(`Failed to fetch purchase order: ${poError.message}`, 500);
      }

      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          products(id, sku, name, unit_of_measure)
        `)
        .eq('po_id', id);

      if (itemsError) {
        throw new AppError(`Failed to fetch PO items: ${itemsError.message}`, 500);
      }

      return { ...po, items: items || [] };
    } catch (error) {
      console.error('Get purchase order by ID error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch purchase order', 500);
    }
  }

  /**
   * Create new purchase order
   */
  static async create(input: CreatePurchaseOrderInput, createdBy: string): Promise<PurchaseOrder> {
    try {
      const poNumber = await this.generatePONumber();

      // Calculate totals
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.quantity_ordered * item.unit_cost,
        0
      );
      const taxAmount = 0; // Tax can be added if needed
      const totalAmount = subtotal + taxAmount;

      // Create PO
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: input.supplier_id,
          order_date: input.order_date,
          expected_delivery_date: input.expected_delivery_date || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          created_by: createdBy,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (poError) {
        throw new AppError(`Failed to create purchase order: ${poError.message}`, 500);
      }

      // Create PO items
      const poItems = input.items.map((item) => ({
        po_id: po.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_cost: item.unit_cost,
        total_cost: item.quantity_ordered * item.unit_cost,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsError) {
        // Rollback: delete the PO
        await supabase.from('purchase_orders').delete().eq('id', po.id);
        throw new AppError(`Failed to create PO items: ${itemsError.message}`, 500);
      }

      return po;
    } catch (error) {
      console.error('Create purchase order error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create purchase order', 500);
    }
  }

  /**
   * Update purchase order status
   */
  static async updateStatus(
    id: string,
    status: string,
    userId?: string
  ): Promise<PurchaseOrder> {
    try {
      const updateData: any = { status };

      if (status === 'received' && userId) {
        updateData.received_by = userId;
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new AppError(`Failed to update status: ${error.message}`, 500);
      }

      return data;
    } catch (error) {
      console.error('Update PO status error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update status', 500);
    }
  }

  /**
   * Record shipment receipt
   */
  static async recordReceipt(
    poId: string,
    items: Array<{
      item_id: string;
      quantity_received: number;
    }>,
    receivedBy: string
  ): Promise<void> {
    try {
      // Update each item's received quantity
      for (const item of items) {
        const { error } = await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_received })
          .eq('id', item.item_id);

        if (error) {
          throw new AppError(`Failed to update item: ${error.message}`, 500);
        }
      }

      // Check if all items are fully received
      const { data: poItems, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('quantity_ordered, quantity_received')
        .eq('po_id', poId);

      if (itemsError) {
        throw new AppError(`Failed to check items: ${itemsError.message}`, 500);
      }

      const allReceived = poItems?.every(
        (item) => item.quantity_received >= item.quantity_ordered
      );

      const partiallyReceived = poItems?.some(
        (item) => item.quantity_received > 0
      );

      let newStatus = 'ordered';
      if (allReceived) {
        newStatus = 'received';
      } else if (partiallyReceived) {
        newStatus = 'partial';
      }

      // Update PO status
      await this.updateStatus(poId, newStatus, receivedBy);
    } catch (error) {
      console.error('Record receipt error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to record receipt', 500);
    }
  }

  /**
   * Get purchase orders by supplier
   */
  static async getBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError(`Failed to fetch POs: ${error.message}`, 500);
      }

      return data || [];
    } catch (error) {
      console.error('Get POs by supplier error:', error);
      throw error instanceof AppError ? error : new AppError('Failed to fetch POs', 500);
    }
  }
}
