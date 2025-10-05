'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { PaymentMethod } from '@/models/enums/PaymentMethod';
import { Package } from '@/models/entities/Package';
import { CurrentOrder, CurrentOrderItem } from '@/data/repositories/CurrentOrderRepository';

export interface CartItem {
  id: string; // Temp ID for cart
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  notes?: string;
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

  /**
   * Load existing cart from database
   * Restores cart items if cashier has an active current order
   * Called on mount to restore cart after page reload
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
      console.log('[CartContext] Loading existing cart for cashier:', cashierId);
      setIsLoadingCart(true);

      // Fetch active current order for this cashier
      const response = await fetch(`/api/current-orders?cashierId=${cashierId}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Get the most recent non-held order
        const activeOrder = result.data.find((order: any) => !order.is_on_hold) || result.data[0];
        
        if (activeOrder && activeOrder.items && activeOrder.items.length > 0) {
          console.log('[CartContext] Found active order with items:', activeOrder.id);
          
          // Set current order ID
          setCurrentOrderId(activeOrder.id);
          
          // Convert database items to cart items
          const cartItems: CartItem[] = activeOrder.items.map((item: any) => ({
            id: `db-${item.id}`, // Mark as DB-synced
            product: {
              id: item.product_id,
              name: item.item_name,
              base_price: item.unit_price,
              // Add other required Product fields with defaults
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
            },
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.subtotal,
            discount: item.discount_amount || 0,
            notes: item.notes,
          }));
          
          // Restore cart items
          setItems(cartItems);
          
          // Restore customer and table if present
          if (activeOrder.customer) {
            setCustomerState(activeOrder.customer);
          }
          if (activeOrder.table) {
            setTableState(activeOrder.table);
          }
          
          console.log('[CartContext] Cart restored with', cartItems.length, 'items');
        } else {
          console.log('[CartContext] Found order but no items:', activeOrder?.id);
        }
      } else {
        console.log('[CartContext] No existing cart found');
      }
      
      setCartLoaded(true);
    } catch (error) {
      console.error('[CartContext] Error loading existing cart:', error);
      setCartLoaded(true); // Mark as loaded even on error to prevent infinite retries
    } finally {
      setIsLoadingCart(false);
    }
  };

  /**
   * Ensure current order exists in database
   * Creates one if it doesn't exist
   */
  const ensureCurrentOrder = useCallback(async (): Promise<string> => {
    if (currentOrderId) return currentOrderId;
    
    if (!cashierId) {
      console.warn('[CartContext] No cashier ID available for creating current order');
      throw new Error('User must be logged in to create orders');
    }

    try {
      console.log('[CartContext] Creating new current order for cashier:', cashierId);
      const response = await fetch('/api/current-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId,
          customerId: customer?.id,
          tableId: table?.id,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.data?.id) {
        console.log('[CartContext] Current order created:', result.data.id);
        setCurrentOrderId(result.data.id);
        return result.data.id;
      } else {
        throw new Error(result.error || 'Failed to create current order');
      }
    } catch (error) {
      console.error('[CartContext] Error creating current order:', error);
      throw error;
    }
  }, [currentOrderId, cashierId, customer, table]);

  /**
   * Add item to cart and sync to current_orders table
   */
  const addItem = useCallback(async (product: Product, quantity: number = 1) => {
    console.log('🔵 [CartContext] addItem called:', { productName: product.name, quantity, cashierId });
    
    try {
      // Ensure we have a current order in the database
      console.log('🔵 [CartContext] Ensuring current order exists...');
      const orderId = await ensureCurrentOrder();
      console.log('🔵 [CartContext] Order ID obtained:', orderId);
      
      // Check if product already in cart
      const existingItem = items.find(item => item.product.id === product.id);
      
      if (existingItem) {
        console.log('🔵 [CartContext] Item already exists, updating quantity');
        // Update quantity in database and local state
        const newQuantity = existingItem.quantity + quantity;
        const newSubtotal = product.base_price * newQuantity;
        
        // Find the database item ID (we'll need to track this)
        const dbItemId = existingItem.id.startsWith('db-') ? existingItem.id.replace('db-', '') : null;
        
        if (dbItemId && cashierId) {
          await fetch(`/api/current-orders/${orderId}/items/${dbItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cashierId,
              updates: {
                quantity: newQuantity,
                subtotal: newSubtotal,
                total: newSubtotal,
              },
            }),
          });
        }
        
        setItems(prevItems => 
          prevItems.map(item => 
            item.product.id === product.id
              ? { ...item, quantity: newQuantity, subtotal: newSubtotal }
              : item
          )
        );
      } else {
        console.log('🔵 [CartContext] Adding new item to database');
        // Add new item to database
        const itemData: CurrentOrderItem = {
          product_id: product.id,
          item_name: product.name,
          quantity,
          unit_price: product.base_price,
          subtotal: product.base_price * quantity,
          discount_amount: 0,
          total: product.base_price * quantity,
        };

        if (cashierId) {
          console.log('🔵 [CartContext] Sending item to API:', { orderId, itemData });
          const response = await fetch(`/api/current-orders/${orderId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cashierId,
              item: itemData,
            }),
          });

          console.log('🔵 [CartContext] API Response status:', response.status);
          const result = await response.json();
          console.log('🔵 [CartContext] API Response:', result);
          
          if (result.success && result.data?.id) {
            // Add to local state with DB ID
            const newItem: CartItem = {
              id: `db-${result.data.id}`, // Mark as DB-synced
              product,
              quantity,
              unitPrice: product.base_price,
              subtotal: product.base_price * quantity,
              discount: 0,
            };
            
            setItems(prevItems => [...prevItems, newItem]);
            console.log('[CartContext] Item added to current order:', result.data.id);
          }
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
      // Fallback to local-only cart if DB sync fails
      setItems(prevItems => {
        const existingIndex = prevItems.findIndex(item => item.product.id === product.id);
        
        if (existingIndex >= 0) {
          const updated = [...prevItems];
          updated[existingIndex].quantity += quantity;
          updated[existingIndex].subtotal = updated[existingIndex].unitPrice * updated[existingIndex].quantity;
          return updated;
        }

        const newItem: CartItem = {
          id: `cart-${Date.now()}-${Math.random()}`,
          product,
          quantity,
          unitPrice: product.base_price,
          subtotal: product.base_price * quantity,
          discount: 0,
        };

        return [...prevItems, newItem];
      });
    }
  }, [items, ensureCurrentOrder, cashierId]);

  /**
   * Add a package to cart (adds all package items)
   */
  const addPackage = useCallback(async (pkg: Package & { items?: any[] }) => {
    console.log('[CartContext] addPackage called with:', pkg);
    
    if (!pkg.items || pkg.items.length === 0) {
      console.warn('[CartContext] Package has no items:', pkg);
      alert('This package has no items configured. Please contact management.');
      return;
    }

    console.log('[CartContext] Package items:', pkg.items);

    // Add each package item using addItem (which syncs to DB)
    for (const packageItem of pkg.items) {
      const product = packageItem.product;
      
      if (!product) {
        console.warn('[CartContext] Package item missing product data:', packageItem);
        continue;
      }

      await addItem(product, packageItem.quantity);
    }
    
    console.log('[CartContext] Package items added to cart');
  }, [addItem]);

  /**
   * Remove item from cart and sync to database
   */
  const removeItem = useCallback(async (itemId: string) => {
    try {
      // Remove from database if it's a DB-synced item
      if (itemId.startsWith('db-') && currentOrderId && cashierId) {
        const dbItemId = itemId.replace('db-', '');
        await fetch(`/api/current-orders/${currentOrderId}/items/${dbItemId}?cashierId=${cashierId}`, {
          method: 'DELETE',
        });
        console.log('[CartContext] Item removed from database:', dbItemId);
      }
    } catch (error) {
      console.error('[CartContext] Error removing item from database:', error);
    }
    
    // Always remove from local state
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, [currentOrderId, cashierId]);

  /**
   * Update item quantity and sync to database
   */
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      // Update in database if it's a DB-synced item
      if (itemId.startsWith('db-') && currentOrderId && cashierId) {
        const dbItemId = itemId.replace('db-', '');
        const item = items.find(i => i.id === itemId);
        
        if (item) {
          const newSubtotal = item.unitPrice * quantity;
          await fetch(`/api/current-orders/${currentOrderId}/items/${dbItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cashierId,
              updates: {
                quantity,
                subtotal: newSubtotal,
                total: newSubtotal,
              },
            }),
          });
          console.log('[CartContext] Item quantity updated in database:', dbItemId);
        }
      }
    } catch (error) {
      console.error('[CartContext] Error updating item quantity in database:', error);
    }

    // Always update local state
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity, subtotal: item.unitPrice * quantity }
          : item
      )
    );
  }, [items, currentOrderId, cashierId, removeItem]);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  /**
   * Set customer and update in database
   */
  const setCustomer = useCallback(async (customer: Customer | null) => {
    setCustomerState(customer);
    
    // Update in database if we have a current order
    if (currentOrderId && cashierId) {
      try {
        await fetch(`/api/current-orders/${currentOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierId,
            customerId: customer?.id,
          }),
        });
        console.log('[CartContext] Customer updated in database');
      } catch (error) {
        console.error('[CartContext] Error updating customer in database:', error);
      }
    }
  }, [currentOrderId, cashierId]);

  /**
   * Set table and update in database
   */
  const setTable = useCallback(async (table: RestaurantTable | null) => {
    setTableState(table);
    
    // Update in database if we have a current order
    if (currentOrderId && cashierId) {
      try {
        await fetch(`/api/current-orders/${currentOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierId,
            tableId: table?.id,
          }),
        });
        console.log('[CartContext] Table updated in database');
      } catch (error) {
        console.error('[CartContext] Error updating table in database:', error);
      }
    }
  }, [currentOrderId, cashierId]);

  const setPaymentMethod = useCallback((method: PaymentMethod | null) => {
    setPaymentMethodState(method);
  }, []);

  /**
   * Clear cart and delete current order from database
   */
  const clearCart = useCallback(async () => {
    try {
      // Delete current order from database
      if (currentOrderId && cashierId) {
        await fetch(`/api/current-orders/${currentOrderId}?cashierId=${cashierId}`, {
          method: 'DELETE',
        });
        console.log('[CartContext] Current order deleted from database');
      }
    } catch (error) {
      console.error('[CartContext] Error deleting current order:', error);
    }
    
    // Clear local state
    setItems([]);
    setCustomerState(null);
    setTableState(null);
    setPaymentMethodState(null);
    setCurrentOrderId(null);
    // Don't reset cartLoaded - this allows for creating a new cart immediately
  }, [currentOrderId, cashierId]);

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
