'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '@/models/entities/Product';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { PaymentMethod } from '@/models/enums/PaymentMethod';

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
  addItem: (product: Product, quantity?: number) => void;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [table, setTableState] = useState<RestaurantTable | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod | null>(null);

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setItems(prevItems => {
      // Check if product already in cart
      const existingIndex = prevItems.findIndex(item => item.product.id === product.id);
      
      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        updated[existingIndex].subtotal = updated[existingIndex].unitPrice * updated[existingIndex].quantity;
        return updated;
      }

      // Add new item
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
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity, subtotal: item.unitPrice * quantity }
          : item
      )
    );
  }, [removeItem]);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  }, []);

  const setCustomer = useCallback((customer: Customer | null) => {
    setCustomerState(customer);
    // TODO: Recalculate prices based on customer tier
  }, []);

  const setTable = useCallback((table: RestaurantTable | null) => {
    setTableState(table);
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod | null) => {
    setPaymentMethodState(method);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerState(null);
    setTableState(null);
    setPaymentMethodState(null);
  }, []);

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

  const value: CartContextType = {
    items,
    customer,
    table,
    paymentMethod,
    addItem,
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

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
