'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCurrentOrders } from '@/lib/hooks/useCurrentOrders';
import { ProductGrid } from './ProductGrid';
import { CurrentOrderPanel } from './CurrentOrderPanel';
import { Card } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { Badge } from '../shared/ui/badge';
import { User, MapPin, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * POSInterfaceV2
 * 
 * New POS interface using current_orders staging table
 * Key features:
 * - Click product → instant database insert
 * - Real-time updates across all pages
 * - Cashier-specific order isolation
 * - Auto-creates order if none exists
 * 
 * How it works:
 * 1. Cashier opens POS → loads their current orders
 * 2. Click "New Order" or auto-create if none exists
 * 3. Click product → instantly added to database
 * 4. Real-time subscriptions update:
 *    - CurrentOrderPanel (right side)
 *    - Customer monitor page (/order-monitor/[tableNumber])
 * 5. Click "Checkout" → move to payment
 */
export function POSInterfaceV2() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<any>(null);

  const {
    activeOrder,
    createOrder,
    updateOrder,
    loading,
    error,
  } = useCurrentOrders(user?.id || '');

  /**
   * Auto-create order if none exists
   */
  useEffect(() => {
    if (!loading && !activeOrder && user?.id) {
      handleCreateOrder();
    }
  }, [loading, activeOrder, user?.id]);

  /**
   * Create new current order
   */
  const handleCreateOrder = async () => {
    try {
      await createOrder({
        customerId: selectedCustomer?.id,
        tableId: selectedTable?.id,
      });
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  /**
   * Update order with customer
   */
  const handleSelectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    if (activeOrder?.id) {
      await updateOrder(activeOrder.id, {
        customerId: customer.id,
      });
    }
  };

  /**
   * Update order with table
   */
  const handleSelectTable = async (table: any) => {
    setSelectedTable(table);
    if (activeOrder?.id) {
      await updateOrder(activeOrder.id, {
        tableId: table.id,
      });
    }
  };

  /**
   * Handle checkout
   */
  const handleCheckout = (orderId: string) => {
    // Navigate to checkout/payment page
    router.push(`/checkout?orderId=${orderId}`);
  };

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-semibold mb-2">Not Authenticated</h3>
        <p className="text-gray-600">Please log in to access POS</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-semibold mb-2">Error</h3>
        <p className="text-gray-600">{error}</p>
        <Button onClick={handleCreateOrder} className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="h-full flex gap-4 p-4">
      {/* Left Side: Product Grid */}
      <div className="flex-1 overflow-auto">
        {/* Header Info */}
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">POS Terminal</h2>
              <p className="text-sm text-gray-600">
                Cashier: {user.full_name || user.email}
              </p>
            </div>
            <div className="flex gap-2">
              {selectedCustomer && (
                <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
                  <User className="w-3 h-3" />
                  {selectedCustomer.full_name}
                </Badge>
              )}
              {selectedTable && (
                <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                  <MapPin className="w-3 h-3" />
                  Table {selectedTable.table_number}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Product Grid */}
        <ProductGrid
          currentOrderId={activeOrder?.id || null}
          cashierId={user.id}
          customerId={selectedCustomer?.id}
          customerTier={selectedCustomer?.tier}
          onProductAdded={() => {
            console.log('Product added! Real-time will update automatically');
          }}
        />
      </div>

      {/* Right Side: Current Order Panel */}
      <div className="w-96 flex-shrink-0">
        <CurrentOrderPanel
          cashierId={user.id}
          onCheckout={handleCheckout}
        />
      </div>
    </div>
  );
}
