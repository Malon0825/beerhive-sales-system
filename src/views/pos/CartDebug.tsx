'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/contexts/CartContext';

/**
 * CartDebug Component
 * Temporary component to debug cart persistence issues
 * Shows user ID, cart state, and database records
 * 
 * REMOVE THIS COMPONENT ONCE DEBUGGING IS COMPLETE
 */
export function CartDebug() {
  const { user } = useAuth();
  const cart = useCart();
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch current orders from database
   */
  const fetchOrders = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [CartDebug] Fetching orders for cashier:', user.id);
      const url = `/api/current-orders?cashierId=${user.id}`;
      console.log('🔍 [CartDebug] Request URL:', url);
      
      const response = await fetch(url);
      console.log('🔍 [CartDebug] Response status:', response.status);
      
      const result = await response.json();
      console.log('🔍 [CartDebug] Response data:', result);
      
      if (result.success) {
        console.log('🔍 [CartDebug] Orders found:', result.data?.length || 0);
        setDbOrders(result.data || []);
      } else {
        console.error('🔍 [CartDebug] Fetch failed:', result.error);
        setError(result.error || 'Failed to fetch orders');
      }
    } catch (err: any) {
      console.error('🔍 [CartDebug] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        fetchOrders();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border-2 border-red-500 rounded-lg p-4 max-w-md z-50">
        <h3 className="font-bold text-red-800 mb-2">⚠️ Debug: User Not Logged In</h3>
        <p className="text-sm text-red-700">Cart persistence requires authentication</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-50 border-2 border-blue-500 rounded-lg p-4 max-w-md z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-blue-900">🔍 Cart Debug Panel</h3>
        <button 
          onClick={fetchOrders}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* User Info */}
      <div className="mb-3 p-2 bg-white rounded border border-blue-200">
        <div className="text-xs font-semibold text-blue-800 mb-1">Current User:</div>
        <div className="text-xs text-gray-700 break-all">
          <strong>ID:</strong> {user.id}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Name:</strong> {user.full_name || user.username || 'Unknown'}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Role:</strong> {user.role}
        </div>
      </div>

      {/* Cart State */}
      <div className="mb-3 p-2 bg-white rounded border border-blue-200">
        <div className="text-xs font-semibold text-blue-800 mb-1">Cart State:</div>
        <div className="text-xs text-gray-700">
          <strong>Items:</strong> {cart.items.length}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Loading:</strong> {cart.isLoadingCart ? '✅ Yes' : '❌ No'}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Order ID:</strong> {cart.currentOrderId || 'None'}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Customer:</strong> {cart.customer?.full_name || 'None'}
        </div>
        <div className="text-xs text-gray-700">
          <strong>Table:</strong> {cart.table ? `Table ${cart.table.table_number}` : 'None'}
        </div>
      </div>

      {/* Database Records */}
      <div className="p-2 bg-white rounded border border-blue-200">
        <div className="text-xs font-semibold text-blue-800 mb-1">
          Database Records: {isLoading ? '⏳ Loading...' : ''}
        </div>
        
        {error && (
          <div className="text-xs text-red-600 mb-2">
            ❌ Error: {error}
          </div>
        )}
        
        {dbOrders.length === 0 ? (
          <div className="text-xs text-orange-600 font-medium">
            ⚠️ No orders found in database
          </div>
        ) : (
          <div className="space-y-2">
            {dbOrders.map((order, idx) => (
              <div key={order.id} className="text-xs border-t pt-2">
                <div className="font-medium text-gray-800">Order #{idx + 1}</div>
                <div className="text-gray-600">ID: {order.id?.substring(0, 8)}...</div>
                <div className="text-gray-600">Items: {order.items?.length || 0}</div>
                <div className="text-gray-600">
                  Created: {new Date(order.created_at).toLocaleTimeString()}
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="ml-2 mt-1 text-gray-500">
                    {order.items.map((item: any) => (
                      <div key={item.id}>
                        • {item.item_name} x{item.quantity}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded">
        <div className="text-xs text-yellow-800">
          <strong>📝 What to check:</strong>
          <ul className="list-disc ml-4 mt-1 space-y-1">
            <li>Is User ID showing? ✅ Good</li>
            <li>Add item → Does "Items" count increase?</li>
            <li>Add item → Does "Database Records" show order?</li>
            <li>Refresh page → Does cart restore?</li>
          </ul>
        </div>
      </div>

      {/* Remove Notice */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        <em>Remove CartDebug component after fixing</em>
      </div>
    </div>
  );
}
