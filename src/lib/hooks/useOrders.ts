'use client';

import { useState, useCallback } from 'react';
import { useCart } from '../contexts/CartContext';
import { PaymentMethod } from '@/models/enums/PaymentMethod';

/**
 * Hook for order operations
 */
export function useOrders() {
  const cart = useCart();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create order from cart
   */
  const createOrder = useCallback(async (paymentData: {
    paymentMethod: PaymentMethod;
    amountTendered?: number;
  }) => {
    try {
      setIsCreatingOrder(true);
      setError(null);

      // Validate cart
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Prepare order data
      const orderData = {
        customer_id: cart.customer?.id,
        table_id: cart.table?.id,
        items: cart.items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discount,
          notes: item.notes,
        })),
        payment_method: paymentData.paymentMethod,
        amount_tendered: paymentData.amountTendered,
        notes: null,
      };

      // Call API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Clear cart on success
      cart.clearCart();

      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreatingOrder(false);
    }
  }, [cart]);

  /**
   * Hold order (save for later)
   */
  const holdOrder = useCallback(async () => {
    try {
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // TODO: Implement hold order functionality
      // Could save to localStorage or backend
      
      cart.clearCart();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [cart]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createOrder,
    holdOrder,
    isCreatingOrder,
    error,
    clearError,
  };
}
