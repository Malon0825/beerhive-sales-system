'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/models/entities/Product';

/**
 * Interface for tracking stock in memory
 * Keeps original stock from DB and tracks temporary deductions
 */
interface StockState {
  [productId: string]: {
    originalStock: number;  // Stock from database
    currentStock: number;   // Stock after cart deductions (memory only)
  };
}

/**
 * Stock Tracker Context Type
 * Manages realtime stock tracking in memory without DB updates
 */
interface StockTrackerContextType {
  /**
   * Initialize stock from products array
   * @param products - Array of products from database
   */
  initializeStock: (products: Product[]) => void;
  
  /**
   * Get current display stock for a product (after cart deductions)
   * @param productId - Product ID to check
   * @returns Current stock number for display
   */
  getCurrentStock: (productId: string) => number;
  
  /**
   * Reserve stock when adding to cart (deduct in memory only)
   * @param productId - Product ID
   * @param quantity - Quantity to reserve
   */
  reserveStock: (productId: string, quantity: number) => void;
  
  /**
   * Release reserved stock when removing from cart
   * @param productId - Product ID
   * @param quantity - Quantity to release
   */
  releaseStock: (productId: string, quantity: number) => void;
  
  /**
   * Reset all stock to original values (clear all reservations)
   */
  resetAllStock: () => void;
  
  /**
   * Check if product has sufficient stock
   * @param productId - Product ID
   * @param quantity - Required quantity
   * @returns true if stock is sufficient
   */
  hasStock: (productId: string, quantity: number) => boolean;

  /**
   * Determine if the tracker already has an entry for the given product
   * Useful for ensuring initialization completed before reserving stock
   */
  isProductTracked: (productId: string) => boolean;
}

const StockTrackerContext = createContext<StockTrackerContextType | undefined>(undefined);

/**
 * Stock Tracker Provider Component
 * 
 * Manages realtime stock deductions in memory without saving to database.
 * Stock is only saved to DB after successful payment completion.
 * 
 * Features:
 * - In-memory stock tracking
 * - Automatic stock reservation when items added to cart
 * - Stock restoration when items removed from cart
 * - Reset capability for cart clear/payment failure
 * 
 * @component
 */
export function StockTrackerProvider({ children }: { children: React.ReactNode }) {
  const [stockState, setStockState] = useState<StockState>({});

  /**
   * Initialize stock tracker with products from database
   * Called when products are loaded in POS interface
   */
  const initializeStock = useCallback((products: Product[]) => {
    console.log('📊 [StockTracker] Initializing stock for', products.length, 'products');

    setStockState(prev => {
      const nextState: StockState = {};

      let hasDifference = false;

      products.forEach(product => {
        const existing = prev[product.id];
        const originalStock = product.current_stock;

        // Preserve any in-flight reservations by carrying over the diff between
        // original and current stock. This avoids giving the UI extra stock when
        // the catalog refetches (e.g. navigating away and back to POS).
        const reservedQuantity = existing
          ? Math.max(0, existing.originalStock - existing.currentStock)
          : 0;

        const computedState = {
          originalStock,
          currentStock: Math.max(0, originalStock - reservedQuantity),
        };

        nextState[product.id] = computedState;

        if (!existing) {
          hasDifference = true;
        } else if (
          existing.originalStock !== computedState.originalStock ||
          existing.currentStock !== computedState.currentStock
        ) {
          hasDifference = true;
        }
      });

      if (!hasDifference) {
        return prev;
      }

      return nextState;
    });
  }, []);

  /**
   * Get current display stock (after cart deductions)
   */
  const getCurrentStock = useCallback((productId: string): number => {
    const state = stockState[productId];
    if (!state) return 0;
    return state.currentStock;
  }, [stockState]);

  /**
   * Reserve stock when product added to cart
   * Deducts from currentStock but keeps originalStock unchanged
   */
  const reserveStock = useCallback((productId: string, quantity: number) => {
    setStockState(prev => {
      const current = prev[productId];
      if (!current) {
        console.warn('⚠️ [StockTracker] Product not found in stock:', productId);
        return prev;
      }

      const newCurrentStock = Math.max(0, current.currentStock - quantity);
      
      console.log('📉 [StockTracker] Reserved stock:', {
        productId,
        quantity,
        before: current.currentStock,
        after: newCurrentStock,
      });

      return {
        ...prev,
        [productId]: {
          ...current,
          currentStock: newCurrentStock,
        },
      };
    });
  }, []);

  /**
   * Release reserved stock when product removed from cart
   * Restores to currentStock (but never exceeds originalStock)
   */
  const releaseStock = useCallback((productId: string, quantity: number) => {
    setStockState(prev => {
      const current = prev[productId];
      if (!current) {
        console.warn('⚠️ [StockTracker] Product not found in stock:', productId);
        return prev;
      }

      const newCurrentStock = Math.min(
        current.originalStock,
        current.currentStock + quantity
      );
      
      console.log('📈 [StockTracker] Released stock:', {
        productId,
        quantity,
        before: current.currentStock,
        after: newCurrentStock,
      });

      return {
        ...prev,
        [productId]: {
          ...current,
          currentStock: newCurrentStock,
        },
      };
    });
  }, []);

  /**
   * Reset all stock to original values
   * Called when cart is cleared or payment fails
   */
  const resetAllStock = useCallback(() => {
    console.log('🔄 [StockTracker] Resetting all stock to original values');
    
    setStockState(prev => {
      const reset: StockState = {};
      Object.entries(prev).forEach(([productId, state]) => {
        reset[productId] = {
          originalStock: state.originalStock,
          currentStock: state.originalStock,
        };
      });
      return reset;
    });
  }, []);

  /**
   * Check if sufficient stock is available
   */
  const hasStock = useCallback((productId: string, quantity: number): boolean => {
    const current = stockState[productId];
    if (!current) return false;
    return current.currentStock >= quantity;
  }, [stockState]);

  /**
   * Check whether a product already exists in the stock snapshot
   */
  const isProductTracked = useCallback((productId: string): boolean => {
    return Boolean(stockState[productId]);
  }, [stockState]);

  const value: StockTrackerContextType = {
    initializeStock,
    getCurrentStock,
    reserveStock,
    releaseStock,
    resetAllStock,
    hasStock,
    isProductTracked,
  };

  return (
    <StockTrackerContext.Provider value={value}>
      {children}
    </StockTrackerContext.Provider>
  );
}

/**
 * Hook to access Stock Tracker context
 * Must be used within StockTrackerProvider
 */
export function useStockTracker() {
  const context = useContext(StockTrackerContext);
  if (context === undefined) {
    throw new Error('useStockTracker must be used within a StockTrackerProvider');
  }
  return context;
}
