'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { PaymentMethod } from '@/models/enums/PaymentMethod';
import { Package } from '@/models/entities/Package';
import { CurrentOrder, CurrentOrderItem } from '@/data/repositories/CurrentOrderRepository';
import { useOrderBroadcast } from '@/lib/hooks/useOrderBroadcast';
import { 
  saveOrder, 
  saveOrderItem, 
  deleteOrderItem,
  LocalOrder,
  LocalOrderItem 
} from '@/lib/utils/indexedDB';

/**
 * Cart Item Interface
 * Represents an item in the shopping cart
 * Can be either a product or a package
 */
export interface CartItem {
  id: string; // Temp ID for cart
  product?: Product; // Only set for product items
  package?: Package & { items?: any[] }; // Only set for package items
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  notes?: string;
  itemName: string; // Display name (product or package name)
  isPackage: boolean; // Flag to identify package items
}

interface CartContextType {
  items: CartItem[];
  customer: Customer | null;
  table: RestaurantTable | null;
  paymentMethod: PaymentMethod | null;
  currentOrderId: string | null; // Current order ID in database
  isLoadingCart: boolean; // Indicates if cart is being loaded from database
  addItem: (product: Product, quantity?: number) => void;
  addPackage: (pkg: Package & { items?: any[] }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setTable: (table: RestaurantTable | null) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [table, setTableState] = useState<RestaurantTable | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(userId || null);
  const [isLoadingCart, setIsLoadingCart] = useState<boolean>(true);
  const [cartLoaded, setCartLoaded] = useState<boolean>(false);

  // Initialize BroadcastChannel for real-time customer display updates
  const {
    broadcastOrderCreated,
    broadcastOrderUpdated,
    broadcastItemAdded,
    broadcastItemUpdated,
    broadcastItemRemoved,
  } = useOrderBroadcast('beerhive_orders');

  /**
   * Load existing cart from IndexedDB (LOCAL-FIRST)
   * Restores cart items if cashier has an active local order
   * Called on mount to restore cart after page reload
   * 
   * Handles errors gracefully - if IndexedDB fails, cart starts empty
   */
  const loadExistingCart = async () => {
    if (!cashierId) {
      console.log('[CartContext] No cashier ID, skipping cart load');
      setIsLoadingCart(false);
      return;
    }

    if (cartLoaded) {
      console.log('[CartContext] Cart already loaded, skipping');
      return;
    }

    try {
      // Check if IndexedDB is supported
      if (typeof indexedDB === 'undefined') {
        console.warn('[CartContext] IndexedDB not supported, starting with empty cart');
        setIsLoadingCart(false);
        setCartLoaded(true);
        return;
      }

      console.log('[CartContext] Loading existing cart from IndexedDB for cashier:', cashierId);
      setIsLoadingCart(true);

      // Load all draft orders from IndexedDB
      const { getAllOrders, getOrderItems } = await import('@/lib/utils/indexedDB');
      const allOrders = await getAllOrders();
      const draftOrders = allOrders.filter(o => o.status === 'draft');

      if (draftOrders.length > 0) {
        // Get the most recent order (assume one order per cashier)
        const activeOrder = draftOrders[draftOrders.length - 1];
        console.log('[CartContext] Found local order:', activeOrder.id);
        
        // Set current order ID
        setCurrentOrderId(activeOrder.id);
        
        // Load order items from IndexedDB
        const orderItems = await getOrderItems(activeOrder.id);
        
        if (orderItems.length > 0) {
          // Convert to cart items (minimal reconstruction)
          const cartItems: CartItem[] = orderItems.map((item) => ({
            id: item.id,
            product: item.productId ? {
              id: item.productId,  // Use stored product ID
              name: item.itemName,
              base_price: item.unitPrice,
              sku: '',
              barcode: null,
              description: null,
              category_id: null,
              vip_price: null,
              cost_price: null,
              current_stock: 0,
              unit_of_measure: 'pcs',
              reorder_point: 0,
              reorder_quantity: 0,
              size_variant: null,
              alcohol_percentage: null,
              image_url: null,
              display_order: 0,
              is_active: true,
              is_featured: false,
              created_by: null,
              created_at: '',
              updated_at: '',
            } : undefined,
            package: item.packageId ? {
              id: item.packageId,  // Use stored package ID
              name: item.itemName,
              base_price: item.unitPrice,
              package_code: '',
              description: null,
              package_type: 'regular' as const,
              vip_price: null,
              cost_price: null,
              valid_from: null,
              valid_until: null,
              is_addon_eligible: false,
              time_restrictions: null,
              is_active: true,
              created_by: null,
              created_at: '',
              updated_at: '',
            } : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            discount: item.discountAmount,
            notes: item.notes,
            itemName: item.itemName,
            isPackage: !!item.packageId,
          }));
          
          setItems(cartItems);
          console.log('[CartContext] Cart restored from IndexedDB with', cartItems.length, 'items');
        }
        
        // Restore table if present
        if (activeOrder.tableNumber) {
          // Create minimal table object (table will need to be re-selected for full data)
          setTableState({
            id: activeOrder.tableNumber,
            table_number: activeOrder.tableNumber,
            capacity: 0,
            status: 'available',
            area: null,
            location: null,
            current_order_id: null,
            notes: null,
            is_active: true,
            created_at: '',
            updated_at: '',
          } as RestaurantTable);
        }
      } else {
        console.log('[CartContext] No existing local cart found');
      }
      
      setCartLoaded(true);
    } catch (error) {
      console.error('[CartContext] Error loading cart from IndexedDB:', error);
      setCartLoaded(true); // Mark as loaded even on error to prevent infinite retries
    } finally {
      setIsLoadingCart(false);
    }
  };

  /**
   * Synchronize cart to IndexedDB for real-time customer display updates
   * This enables instant updates on customer-facing screens via BroadcastChannel
   * 
   * NEW: Works for both dine-in (with table) and takeout (without table)
   * Handles errors gracefully - cart continues to work even if sync fails
   */
  const syncToIndexedDB = useCallback(async (orderId: string) => {
    // Check if IndexedDB is supported
    if (typeof indexedDB === 'undefined') {
      console.warn('[CartContext] IndexedDB not supported, skipping sync');
      return;
    }

    try {
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = items.reduce((sum, item) => sum + item.discount, 0);
      const totalAmount = subtotal - discountAmount;

      // Create local order object
      // Works for both dine-in (tableNumber = string) and takeout (tableNumber = undefined)
      const localOrder: LocalOrder = {
        id: orderId,
        cashierId: cashierId || undefined, // Track which staff member created this order
        tableNumber: table?.table_number, // undefined = TAKEOUT, string = DINE-IN
        customerId: customer?.id,
        customerName: customer?.full_name,
        customerTier: customer?.tier,
        orderNumber: orderId,
        subtotal,
        discountAmount,
        taxAmount: 0,
        totalAmount,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save order to IndexedDB
      await saveOrder(localOrder);
      console.log('💾 [CartContext] Order synced to IndexedDB:', orderId);

      // Save each item to IndexedDB
      for (const item of items) {
        const localItem: LocalOrderItem = {
          id: item.id,
          orderId,
          productId: item.product?.id,  // Store actual product ID
          packageId: item.package?.id,  // Store actual package ID
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          discountAmount: item.discount,
          total: item.subtotal - item.discount,
          notes: item.notes,
          isVipPrice: false,
          isComplimentary: false,
          createdAt: new Date().toISOString(),
        };
        
        await saveOrderItem(localItem);
      }

      // Broadcast update to customer displays
      // Use cashierId-based identifier for takeout orders (enables multi-cashier takeout)
      const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
      broadcastOrderUpdated(orderId, broadcastIdentifier, localOrder);
      
      if (table?.table_number) {
        console.log('📡 [CartContext] DINE-IN broadcast to table:', table.table_number);
      } else {
        console.log('📡 [CartContext] TAKEOUT broadcast for cashier:', cashierId);
      }
    } catch (error) {
      console.error('[CartContext] Error syncing to IndexedDB:', error);
    }
  }, [items, customer, table, cashierId, broadcastOrderUpdated]);

  /**
   * Ensure current order exists locally (IndexedDB)
   * Creates one if it doesn't exist
   * LOCAL-FIRST: No database calls, only IndexedDB
   * 
   * NEW BEHAVIOR:
   * - If table selected → Dine-in order (with tableNumber)
   * - If NO table selected → Takeout order (tableNumber = undefined)
   * - Both create orders immediately in IndexedDB
   * - Multiple cashiers can have simultaneous takeout orders
   */
  const ensureCurrentOrder = useCallback(async (): Promise<string | null> => {
    if (currentOrderId) return currentOrderId;
    
    if (!cashierId) {
      console.warn('[CartContext] No cashier ID available for creating current order');
      return null; // Can't create order without cashier
    }

    try {
      // Determine order type
      const orderType = table?.table_number ? 'dine-in' : 'takeout';
      console.log(`[CartContext] Creating new ${orderType.toUpperCase()} order for cashier:`, cashierId);
      
      // Generate unique order ID with cashier ID for isolation
      const orderId = `local_order_${cashierId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create order in IndexedDB (LOCAL STORAGE ONLY)
      // tableNumber is undefined for takeout, string for dine-in
      const localOrder: LocalOrder = {
        id: orderId,
        cashierId: cashierId || undefined, // Track which staff member created this order
        tableNumber: table?.table_number, // undefined = TAKEOUT, string = DINE-IN
        customerId: customer?.id,
        customerName: customer?.full_name,
        customerTier: customer?.tier,
        orderNumber: orderId,
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await saveOrder(localOrder);
      
      // Broadcast to customer displays
      // Use cashierId as identifier for takeout orders (enables multi-cashier takeout)
      const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
      broadcastOrderCreated(orderId, broadcastIdentifier, localOrder);
      
      console.log('💾 [CartContext] Local order created in IndexedDB:', orderId);
      if (table?.table_number) {
        console.log('📡 [CartContext] DINE-IN order broadcast to table:', table.table_number);
      } else {
        console.log('📡 [CartContext] TAKEOUT order broadcast for cashier:', cashierId);
        console.log('✅ [CartContext] Multiple cashiers can have takeout orders simultaneously');
      }
      
      setCurrentOrderId(orderId);
      return orderId;
    } catch (error) {
      console.error('[CartContext] Error creating local order:', error);
      return null; // Allow cart to continue even if IndexedDB fails
    }
  }, [currentOrderId, cashierId, customer, table, broadcastOrderCreated]);

  /**
   * Add item to cart (LOCAL-FIRST with ROBUST SYNC)
   * Only uses IndexedDB + BroadcastChannel, NO database calls
   * 
   * RELIABILITY IMPROVEMENTS:
   * - Saves to IndexedDB BEFORE updating UI state
   * - Broadcasts updates for quantity changes
   * - Full order sync after every change
   * - Proper error handling
   */
  const addItem = useCallback(async (product: Product, quantity: number = 1) => {
    console.log('🔵 [CartContext] addItem called:', { productName: product.name, quantity });
    
    try {
      // Ensure we have an order ID
      const orderId = await ensureCurrentOrder();
      if (!orderId) {
        console.warn('[CartContext] Could not create order');
        return;
      }
      
      // Check if item already exists in cart
      const existingItem = items.find(item => !item.isPackage && item.product?.id === product.id);
      
      if (existingItem) {
        console.log('🔵 [CartContext] Item already in cart, updating quantity');
        const newQuantity = existingItem.quantity + quantity;
        const newSubtotal = product.base_price * newQuantity;
        
        // STEP 1: Update local state (UI) FIRST for immediate feedback
        setItems(prevItems =>
          prevItems.map(item => 
            !item.isPackage && item.product?.id === product.id
              ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
              : item
          )
        );
        
        // STEP 2: Save item to IndexedDB
        const localItem: LocalOrderItem = {
          id: existingItem.id,
          orderId,
          productId: product.id,
          itemName: product.name,
          quantity: newQuantity,
          unitPrice: product.base_price,
          subtotal: newSubtotal,
          discountAmount: 0,
          total: newSubtotal,
          isVipPrice: false,
          isComplimentary: false,
          createdAt: new Date().toISOString(),
        };
        
        await saveOrderItem(localItem);
        console.log('💾 [CartContext] Quantity updated in IndexedDB:', newQuantity);
        
        // STEP 3: Calculate and save order totals BEFORE broadcasting
        // This ensures customer display reads correct totals
        const allItems = items.map(item => 
          !item.isPackage && item.product?.id === product.id
            ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
            : item
        );
        
        const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
        const discountAmount = allItems.reduce((sum, item) => sum + item.discount, 0);
        const totalAmount = subtotal - discountAmount;
        
        const localOrder: LocalOrder = {
          id: orderId,
          cashierId: cashierId || undefined,
          tableNumber: table?.table_number,
          customerId: customer?.id,
          customerName: customer?.full_name,
          customerTier: customer?.tier,
          orderNumber: orderId,
          subtotal,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await saveOrder(localOrder);
        console.log('💾 [CartContext] Order totals synced BEFORE broadcast:', totalAmount);
        
        // STEP 4: NOW broadcast (customer display will read correct totals)
        const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
        broadcastItemAdded(orderId, broadcastIdentifier, existingItem.id, localItem);
        
        if (table?.table_number) {
          console.log('📡 [CartContext] DINE-IN update broadcast to table:', table.table_number);
        } else {
          console.log('📡 [CartContext] TAKEOUT update broadcast for cashier:', cashierId);
        }
        
      } else {
        console.log('🔵 [CartContext] Adding new item to cart');
        
        // Generate local item ID
        const itemId = `local_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // STEP 1: Create cart item for UI
        const newItem: CartItem = {
          id: itemId,
          product,
          quantity,
          unitPrice: product.base_price,
          subtotal: product.base_price * quantity,
          discount: 0,
          itemName: product.name,
          isPackage: false,
        };
        
        // STEP 2: Update local state (UI) for immediate feedback
        setItems(prevItems => [...prevItems, newItem]);
        
        // STEP 3: Save item to IndexedDB
        const localItem: LocalOrderItem = {
          id: itemId,
          orderId,
          productId: product.id,
          itemName: product.name,
          quantity,
          unitPrice: product.base_price,
          subtotal: product.base_price * quantity,
          discountAmount: 0,
          total: product.base_price * quantity,
          isVipPrice: false,
          isComplimentary: false,
          createdAt: new Date().toISOString(),
        };
        
        await saveOrderItem(localItem);
        console.log('💾 [CartContext] Item saved to IndexedDB');
        
        // STEP 4: Calculate and save order totals BEFORE broadcasting
        // Include the new item in total calculation
        const allItems = [...items, newItem];
        const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
        const discountAmount = allItems.reduce((sum, item) => sum + item.discount, 0);
        const totalAmount = subtotal - discountAmount;
        
        const localOrder: LocalOrder = {
          id: orderId,
          cashierId: cashierId || undefined,
          tableNumber: table?.table_number,
          customerId: customer?.id,
          customerName: customer?.full_name,
          customerTier: customer?.tier,
          orderNumber: orderId,
          subtotal,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await saveOrder(localOrder);
        console.log('💾 [CartContext] Order totals synced BEFORE broadcast:', totalAmount);
        
        // STEP 5: NOW broadcast (customer display will read correct totals)
        const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
        broadcastItemAdded(orderId, broadcastIdentifier, itemId, localItem);
        
        if (table?.table_number) {
          console.log('📡 [CartContext] DINE-IN item broadcast to table:', table.table_number);
        } else {
          console.log('📡 [CartContext] TAKEOUT item broadcast for cashier:', cashierId);
        }
      }
    } catch (error) {
      console.error('❌ [CartContext] Error adding item:', error);
      console.error('❌ [CartContext] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        cashierId,
        productId: product.id
      });
      // Show error to user
      alert('Failed to add item. Please try again.');
    }
  }, [items, ensureCurrentOrder, cashierId, syncToIndexedDB, broadcastItemAdded, table]);

  /**
   * Add a package to cart (LOCAL-FIRST with PROPER SYNC)
   * Only uses IndexedDB + BroadcastChannel, NO database calls
   * 
   * FIX: Save order totals BEFORE broadcasting to ensure customer display reads correct data
   * 
   * @param pkg - Package to add with its items
   */
  const addPackage = useCallback(async (pkg: Package & { items?: any[] }) => {
    console.log('📦 [CartContext] addPackage called with:', pkg);
    
    if (!pkg.items || pkg.items.length === 0) {
      console.warn('[CartContext] Package has no items:', pkg);
      alert('This package has no items configured. Please contact management.');
      return;
    }

    try {
      // Ensure we have a local order
      const orderId = await ensureCurrentOrder();
      if (!orderId) {
        console.warn('[CartContext] Could not create order');
        return;
      }
      
      // Check if package already exists in cart
      const existingItem = items.find(item => item.isPackage && item.package?.id === pkg.id);
      
      if (existingItem) {
        console.log('📦 [CartContext] Package already in cart, updating quantity');
        const newQuantity = existingItem.quantity + 1;
        const newSubtotal = pkg.base_price * newQuantity;
        
        // STEP 1: Update local state (UI) FIRST for immediate feedback
        setItems(prevItems =>
          prevItems.map(item => 
            item.isPackage && item.package?.id === pkg.id
              ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
              : item
          )
        );
        
        // STEP 2: Save item to IndexedDB
        const localItem: LocalOrderItem = {
          id: existingItem.id,
          orderId,
          packageId: pkg.id,
          itemName: pkg.name,
          quantity: newQuantity,
          unitPrice: pkg.base_price,
          subtotal: newSubtotal,
          discountAmount: 0,
          total: newSubtotal,
          isVipPrice: false,
          isComplimentary: false,
          createdAt: new Date().toISOString(),
        };
        
        await saveOrderItem(localItem);
        console.log('💾 [CartContext] Package quantity updated in IndexedDB:', newQuantity);
        
        // STEP 3: Calculate and save order totals BEFORE broadcasting
        const allItems = items.map(item => 
          item.isPackage && item.package?.id === pkg.id
            ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
            : item
        );
        
        const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
        const discountAmount = allItems.reduce((sum, item) => sum + item.discount, 0);
        const totalAmount = subtotal - discountAmount;
        
        const localOrder: LocalOrder = {
          id: orderId,
          cashierId: cashierId || undefined,
          tableNumber: table?.table_number,
          customerId: customer?.id,
          customerName: customer?.full_name,
          customerTier: customer?.tier,
          orderNumber: orderId,
          subtotal,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await saveOrder(localOrder);
        console.log('💾 [CartContext] Order totals synced BEFORE broadcast:', totalAmount);
        
        // STEP 4: NOW broadcast (customer display will read correct totals)
        const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
        broadcastItemUpdated(orderId, broadcastIdentifier, existingItem.id, localItem);
        
        if (table?.table_number) {
          console.log('📡 [CartContext] DINE-IN package broadcast to table:', table.table_number);
        } else {
          console.log('📡 [CartContext] TAKEOUT package broadcast for cashier:', cashierId);
        }
        
        return;
      }
      
      // Generate local item ID
      const itemId = `local_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new cart item for package
      const newItem: CartItem = {
        id: itemId,
        package: pkg,
        quantity: 1,
        unitPrice: pkg.base_price,
        subtotal: pkg.base_price,
        discount: 0,
        itemName: pkg.name,
        isPackage: true,
      };
      
      // STEP 1: Update local state (UI) for immediate feedback
      setItems(prevItems => [...prevItems, newItem]);
      
      // STEP 2: Save package to IndexedDB
      const localItem: LocalOrderItem = {
        id: itemId,
        orderId,
        packageId: pkg.id,
        itemName: pkg.name,
        quantity: 1,
        unitPrice: pkg.base_price,
        subtotal: pkg.base_price,
        discountAmount: 0,
        total: pkg.base_price,
        isVipPrice: false,
        isComplimentary: false,
        createdAt: new Date().toISOString(),
      };
      
      await saveOrderItem(localItem);
      console.log('💾 [CartContext] Package saved to IndexedDB');
      
      // STEP 3: Calculate and save order totals BEFORE broadcasting
      const allItems = [...items, newItem];
      const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = allItems.reduce((sum, item) => sum + item.discount, 0);
      const totalAmount = subtotal - discountAmount;
      
      const localOrder: LocalOrder = {
        id: orderId,
        cashierId: cashierId || undefined,
        tableNumber: table?.table_number,
        customerId: customer?.id,
        customerName: customer?.full_name,
        customerTier: customer?.tier,
        orderNumber: orderId,
        subtotal,
        discountAmount,
        taxAmount: 0,
        totalAmount,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await saveOrder(localOrder);
      console.log('💾 [CartContext] Order totals synced BEFORE broadcast:', totalAmount);
      
      // STEP 4: NOW broadcast (customer display will read correct totals)
      const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
      broadcastItemAdded(orderId, broadcastIdentifier, itemId, localItem);
      
      if (table?.table_number) {
        console.log('📡 [CartContext] DINE-IN package broadcast to table:', table.table_number);
      } else {
        console.log('📡 [CartContext] TAKEOUT package broadcast for cashier:', cashierId);
      }
    } catch (error) {
      console.error('❌ [CartContext] Error adding package:', error);
      console.error('❌ [CartContext] Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        cashierId,
        packageId: pkg.id
      });
      alert('Failed to add package. Please try again.');
    }
  }, [ensureCurrentOrder, cashierId, syncToIndexedDB, broadcastItemAdded, table]);

  /**
   * Remove item from cart (LOCAL-FIRST with PROPER SYNC)
   * Only uses IndexedDB + BroadcastChannel, NO database calls
   * Works for both dine-in and takeout orders
   * 
   * FIX: Removed race condition by properly syncing totals after item removal
   */
  const removeItem = useCallback(async (itemId: string) => {
    console.log('🔴 [CartContext] removeItem called:', itemId);
    
    try {
      // STEP 1: Remove from IndexedDB first
      await deleteOrderItem(itemId);
      console.log('💾 [CartContext] Item removed from IndexedDB');
      
      // STEP 2: Broadcast removal
      if (currentOrderId) {
        const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
        broadcastItemRemoved(currentOrderId, broadcastIdentifier, itemId);
        
        if (table?.table_number) {
          console.log('📡 [CartContext] DINE-IN item removal broadcast to table:', table.table_number);
        } else {
          console.log('📡 [CartContext] TAKEOUT item removal broadcast for cashier:', cashierId);
        }
      }
      
      // STEP 3: Update local state and recalculate totals
      setItems(prevItems => {
        const updatedItems = prevItems.filter(item => item.id !== itemId);
        
        // STEP 4: Sync order totals to IndexedDB with correct data
        if (currentOrderId) {
          (async () => {
            try {
              // Calculate totals from updatedItems (after removal)
              const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
              const discountAmount = updatedItems.reduce((sum, i) => sum + i.discount, 0);
              const totalAmount = subtotal - discountAmount;

              const localOrder: LocalOrder = {
                id: currentOrderId,
                cashierId: cashierId || undefined,
                tableNumber: table?.table_number,
                customerId: customer?.id,
                customerName: customer?.full_name,
                customerTier: customer?.tier,
                orderNumber: currentOrderId,
                subtotal,
                discountAmount,
                taxAmount: 0,
                totalAmount,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await saveOrder(localOrder);
              
              const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
              broadcastOrderUpdated(currentOrderId, broadcastIdentifier, localOrder);
              
              console.log('💾 [CartContext] Order totals updated after item removal');
            } catch (error) {
              console.error('❌ [CartContext] Error syncing after item removal:', error);
            }
          })();
        }
        
        return updatedItems;
      });
      
      console.log('✅ [CartContext] Item removal completed');
    } catch (error) {
      console.error('❌ [CartContext] Error removing item:', error);
      // Show error to user
      alert('Failed to remove item. Please try again.');
    }
  }, [currentOrderId, table, cashierId, customer, broadcastItemRemoved, broadcastOrderUpdated]);

  /**
   * Update item quantity (LOCAL-FIRST with PROPER SYNC)
   * Only uses IndexedDB + BroadcastChannel, NO database calls
   * 
   * FIX: Removed race condition by syncing AFTER state update completes
   * Ensures Customer Display always shows correct quantities
   */
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    console.log('🔵 [CartContext] updateQuantity called:', { itemId, quantity });

    // STEP 1: Calculate updated items outside of setState to avoid stale closure
    setItems(prevItems => {
      const updatedItems = prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity, subtotal: item.unitPrice * quantity }
          : item
      );
      
      // STEP 2: Sync to IndexedDB AFTER state calculation with correct data
      // Use the calculated updatedItems, not stale state from closure
      if (currentOrderId) {
        // Execute sync asynchronously but with correct data
        (async () => {
          try {
            const item = updatedItems.find(i => i.id === itemId);
            if (!item) return;

            // Update the specific item in IndexedDB
            const localItem: LocalOrderItem = {
              id: item.id,
              orderId: currentOrderId,
              productId: item.product?.id,
              packageId: item.package?.id,
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              discountAmount: item.discount,
              total: item.subtotal - item.discount,
              notes: item.notes,
              isVipPrice: false,
              isComplimentary: false,
              createdAt: new Date().toISOString(),
            };
            
            await saveOrderItem(localItem);
            console.log('💾 [CartContext] Item quantity updated in IndexedDB:', quantity);

            // Broadcast the update immediately with correct data
            const broadcastIdentifier = table?.table_number || `takeout_${cashierId}`;
            broadcastItemUpdated(currentOrderId, broadcastIdentifier, itemId, localItem);
            
            if (table?.table_number) {
              console.log('📡 [CartContext] DINE-IN quantity update broadcast to table:', table.table_number);
            } else {
              console.log('📡 [CartContext] TAKEOUT quantity update broadcast for cashier:', cashierId);
            }

            // Full order sync to recalculate totals with updated items
            // Calculate totals from updatedItems (current data)
            const subtotal = updatedItems.reduce((sum, i) => sum + i.subtotal, 0);
            const discountAmount = updatedItems.reduce((sum, i) => sum + i.discount, 0);
            const totalAmount = subtotal - discountAmount;

            const localOrder: LocalOrder = {
              id: currentOrderId,
              cashierId: cashierId || undefined,
              tableNumber: table?.table_number,
              customerId: customer?.id,
              customerName: customer?.full_name,
              customerTier: customer?.tier,
              orderNumber: currentOrderId,
              subtotal,
              discountAmount,
              taxAmount: 0,
              totalAmount,
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await saveOrder(localOrder);
            broadcastOrderUpdated(currentOrderId, broadcastIdentifier, localOrder);
            
            console.log('💾 [CartContext] Order totals synced to IndexedDB');
          } catch (error) {
            console.error('❌ [CartContext] Error syncing quantity update:', error);
          }
        })();
      }
      
      return updatedItems;
    });
    
    console.log('✅ [CartContext] Quantity update completed');
  }, [currentOrderId, removeItem, table, cashierId, customer, broadcastItemUpdated, broadcastOrderUpdated]);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  /**
   * Set customer (LOCAL-FIRST with PROPER SYNC)
   * Only updates IndexedDB, NO database calls
   * 
   * FIX: Removed setTimeout to ensure immediate sync
   */
  const setCustomer = useCallback(async (newCustomer: Customer | null) => {
    setCustomerState(newCustomer);
    
    // Update in IndexedDB if we have a current order
    if (currentOrderId) {
      try {
        // Sync immediately with the new customer data
        await syncToIndexedDB(currentOrderId);
        console.log(' [CartContext] Customer updated in IndexedDB');
      } catch (error) {
        console.error(' [CartContext] Error updating customer:', error);
      }
    }
  }, [currentOrderId, syncToIndexedDB]);

  /**
   * Set table (LOCAL-FIRST)
   * Only updates IndexedDB, NO database calls
   * When table is set for the first time, creates order and syncs existing cart items
   */
  const setTable = useCallback(async (newTable: RestaurantTable | null) => {
    const previousTable = table;
    setTableState(newTable);
    
    // If table is being set for the first time and we have items in cart
    if (!previousTable && newTable?.table_number && items.length > 0) {
      console.log('📍 [CartContext] Table selected with existing cart items, creating order...');
      
      // Create order now that we have a table
      const orderId = await ensureCurrentOrder();
      
      if (orderId) {
        // Sync all existing items to IndexedDB
        await syncToIndexedDB(orderId);
        console.log('💾 [CartContext] Existing cart synced to customer display for table:', newTable.table_number);
      }
    } else if (currentOrderId && newTable?.table_number) {
      // Just update existing order
      await syncToIndexedDB(currentOrderId);
      console.log('💾 [CartContext] Table updated in IndexedDB');
    }
  }, [currentOrderId, table, items, syncToIndexedDB, ensureCurrentOrder]);

  const setPaymentMethod = useCallback((method: PaymentMethod | null) => {
    setPaymentMethodState(method);
  }, []);

  /**
   * Clear cart (LOCAL-FIRST)
   * Only clears IndexedDB, NO database calls
   * Database sync happens only when order is finalized/paid
   */
  const clearCart = useCallback(async () => {
    try {
      // Delete order from IndexedDB
      if (currentOrderId) {
        const { deleteOrder, deleteOrderItems } = await import('@/lib/utils/indexedDB');
        await deleteOrderItems(currentOrderId);
        await deleteOrder(currentOrderId);
        console.log('💾 [CartContext] Order cleared from IndexedDB');
      }
    } catch (error) {
      console.error('[CartContext] Error clearing IndexedDB:', error);
    }
    
    // Clear local state
    setItems([]);
    setCustomerState(null);
    setTableState(null);
    setPaymentMethodState(null);
    setCurrentOrderId(null);
    console.log('🧹 [CartContext] Cart cleared locally');
  }, [currentOrderId]);

  const getSubtotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.subtotal - item.discount, 0);
  }, [items]);

  const getTotal = useCallback(() => {
    // For now, total = subtotal (no tax)
    return getSubtotal();
  }, [getSubtotal]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Update cashierId when userId prop changes
  useEffect(() => {
    if (userId && userId !== cashierId) {
      console.log('[CartContext] Cashier ID updated:', userId);
      setCashierId(userId);
    }
  }, [userId, cashierId]);

  /**
   * Load existing cart on mount
   * Restores cart items if cashier has an active current order
   */
  useEffect(() => {
    if (cashierId && !cartLoaded) {
      console.log('[CartContext] Initializing cart for cashier:', cashierId);
      loadExistingCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashierId]); // Only depend on cashierId to avoid circular dependency

  const value: CartContextType = {
    items,
    customer,
    table,
    paymentMethod,
    currentOrderId,
    isLoadingCart,
    addItem,
    addPackage,
    removeItem,
    updateQuantity,
    updateItemNotes,
    setCustomer,
    setTable,
    setPaymentMethod,
    clearCart,
    getSubtotal,
    getTotal,
    getItemCount,
  };

  // Show loading state while cart is being restored
  if (isLoadingCart) {
    return (
      <CartContext.Provider value={value}>
        {children}
      </CartContext.Provider>
    );
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
