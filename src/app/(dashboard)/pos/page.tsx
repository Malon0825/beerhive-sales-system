'use client';

import React from 'react';
import { CartProvider } from '@/lib/contexts/CartContext';
import { POSInterface } from '@/views/pos/POSInterface';

/**
 * POS Page
 * Point of Sale interface for cashiers
 */
export default function POSPage() {
  return (
    <CartProvider>
      <div className="h-full">
        <POSInterface />
      </div>
    </CartProvider>
  );
}
