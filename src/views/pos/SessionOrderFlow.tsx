'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { 
  ShoppingCart, 
  Check, 
  Send, 
  Clock, 
  User, 
  MapPin,
  Plus,
  Trash2,
  Star,
  Edit
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { OrderStatus } from '@/models/enums/OrderStatus';
import SessionProductSelector from './SessionProductSelector';
import { CustomerSearch } from './CustomerSearch';
import { CustomerTier } from '@/models/enums/CustomerTier';

/**
 * SessionOrderFlow Component
 * Manages order creation and confirmation within a session
 * 
 * Features:
 * - Create draft orders
 * - Add items to cart
 * - Confirm and send to kitchen
 * - Track order status
 * - Session context display
 */
interface SessionOrderFlowProps {
  sessionId: string;
  onOrderConfirmed?: (orderId: string) => void;
}

interface CartItem {
  product_id?: string;
  package_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  is_vip_price?: boolean;
  notes?: string;
}

export default function SessionOrderFlow({ sessionId, onOrderConfirmed }: SessionOrderFlowProps) {
  const [session, setSession] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  /**
   * Fetch session details
   */
  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/order-sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSession(data.data);
        // Set customer from session if exists
        if (data.data.customer) {
          setSelectedCustomer(data.data.customer);
        }
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  /**
   * Update session with customer
   */
  const handleSelectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    
    try {
      // Update session with customer_id
      const response = await fetch(`/api/order-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customer.id }),
      });

      if (response.ok) {
        // Refresh session data
        await fetchSession();
      }
    } catch (error) {
      console.error('Failed to update session customer:', error);
    }
  };

  /**
   * Get tier badge color
   */
  const getTierBadgeColor = (tier: CustomerTier) => {
    switch (tier) {
      case 'vip_platinum':
        return 'bg-gray-800 text-white';
      case 'vip_gold':
        return 'bg-yellow-500 text-white';
      case 'vip_silver':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  /**
   * Format tier display name
   */
  const formatTier = (tier: CustomerTier) => {
    switch (tier) {
      case 'vip_platinum':
        return 'VIP Platinum';
      case 'vip_gold':
        return 'VIP Gold';
      case 'vip_silver':
        return 'VIP Silver';
      default:
        return 'Regular';
    }
  };

  /**
   * Calculate cart totals
   */
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  /**
   * Add item to cart from product selection
   * If product already exists in cart, increment quantity instead of creating duplicate
   */
  const addToCart = (product: any, price: number) => {
    // Check if product already exists in cart
    const existingItemIndex = cart.findIndex(
      item => item.product_id === product.id && item.unit_price === price
    );

    if (existingItemIndex !== -1) {
      // Product exists - increment quantity
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      existingItem.quantity += 1;
      existingItem.subtotal = existingItem.unit_price * existingItem.quantity;
      existingItem.total = existingItem.subtotal;
      setCart(updatedCart);
    } else {
      // New product - add to cart
      const item: CartItem = {
        product_id: product.id,
        item_name: product.name,
        quantity: 1,
        unit_price: price,
        subtotal: price,
        total: price,
        is_vip_price: session?.customer?.tier !== 'regular' && product.vip_price ? true : false,
      };
      setCart([...cart, item]);
    }
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  /**
   * Update item quantity
   */
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    const item = updatedCart[index];
    item.quantity = newQuantity;
    item.subtotal = item.unit_price * newQuantity;
    item.total = item.subtotal; // Add discount logic here if needed
    setCart(updatedCart);
  };

  /**
   * Create draft order
   */
  const createDraftOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          table_id: session?.table_id,
          customer_id: session?.customer_id,
          cashier_id: 'current-user-id', // TODO: Get from auth context
          items: cart,
          subtotal: cartTotal,
          total_amount: cartTotal,
          status: OrderStatus.DRAFT,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentOrder(data.data);
        setCart([]); // Clear cart
        return data.data.id;
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }

    return null;
  };

  /**
   * Confirm order and send to kitchen
   */
  const confirmOrder = async () => {
    setConfirming(true);

    try {
      // Create draft order if not already created
      let orderId = currentOrder?.id;
      if (!orderId) {
        orderId = await createDraftOrder();
        if (!orderId) {
          setConfirming(false);
          return;
        }
      }

      // Confirm the order
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'PATCH',
      });

      const data = await response.json();

      if (data.success) {
        alert('Order confirmed and sent to kitchen!');
        setCurrentOrder(null);
        
        if (onOrderConfirmed) {
          onOrderConfirmed(orderId);
        }

        // Refresh session
        fetchSession();
      } else {
        alert(data.error || 'Failed to confirm order');
      }
    } catch (error) {
      console.error('Failed to confirm order:', error);
      alert('Failed to confirm order');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Product Selection */}
      <div className="space-y-6">
        {/* Session Info Header */}
        {session && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Session</span>
                <Badge className="bg-green-500">{session.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Session Number & Info */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-sm">{session.session_number}</span>
                <div className="flex gap-2">
                  {/* Customer Badge */}
                  {selectedCustomer ? (
                    <Badge 
                      className={`flex items-center gap-1 cursor-pointer ${getTierBadgeColor(selectedCustomer.tier)}`}
                      onClick={() => setShowCustomerSearch(true)}
                    >
                      {selectedCustomer.tier !== 'regular' && <Star className="w-3 h-3" />}
                      <User className="w-3 h-3" />
                      {selectedCustomer.full_name}
                      <Edit className="w-3 h-3 ml-1" />
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCustomerSearch(true)}
                      className="h-6 text-xs"
                    >
                      <User className="w-3 h-3 mr-1" />
                      Select Customer
                    </Button>
                  )}

                  {/* Table Badge */}
                  {session.table && (
                    <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
                      <MapPin className="w-3 h-3" />
                      Table {session.table.table_number}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Customer Details (if VIP) */}
              {selectedCustomer && selectedCustomer.tier !== 'regular' && (
                <div className="p-2 bg-purple-50 rounded text-xs text-purple-800">
                  <Star className="w-3 h-3 inline mr-1" />
                  {formatTier(selectedCustomer.tier)} - Special pricing applied
                </div>
              )}

              {/* Session Total */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Session Total:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(session.total_amount || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Selector */}
        <SessionProductSelector
          customerTier={selectedCustomer?.tier || 'regular'}
          onProductSelect={addToCart}
        />
      </div>

      {/* Right Column - Cart & Actions */}
      <div className="space-y-6">{renderCartSection()}</div>

      {/* Customer Search Dialog */}
      <CustomerSearch
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
      />
    </div>
  );

  /**
   * Render cart section
   */
  function renderCartSection() {
    return (
      <>

      {/* Cart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Current Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No items in cart</p>
              <p className="text-sm">Add items to create an order</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center gap-3 border-b pb-3">
                  <div className="flex-1">
                    <div className="font-medium">{item.item_name}</div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.unit_price)} × {item.quantity}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>

                  <div className="font-bold w-24 text-right">
                    {formatCurrency(item.total)}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* Cart Total */}
              <div className="flex items-center justify-between pt-3 border-t-2">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={cart.length === 0}
            onClick={createDraftOrder}
          >
            <Clock className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>

          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={cart.length === 0 || confirming}
            onClick={confirmOrder}
          >
            {confirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Confirming...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Confirm & Send to Kitchen
              </>
            )}
          </Button>
        </div>
      </>
    );
  }
}
