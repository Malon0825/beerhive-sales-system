'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { 
  ShoppingCart, 
  Send, 
  Clock, 
  User, 
  MapPin,
  Trash2,
  Star,
  Edit,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { OrderStatus } from '@/models/enums/OrderStatus';
import SessionProductSelector from './SessionProductSelector';
import { CustomerSearch } from './CustomerSearch';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { useStockTracker } from '@/lib/contexts/StockTrackerContext';
import { AlertDialogSimple } from '@/views/shared/ui/alert-dialog-simple';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { OfflineTabService } from '@/services/OfflineTabService';
import { toast } from '@/lib/hooks/useToast';
import { OfflineToasts } from '@/lib/utils/toastMessages';

/**
 * SessionOrderFlow Component
 * 
 * Professional order management interface for TAB module with realtime stock tracking.
 * Manages order creation, cart updates, and order confirmation.
 * 
 * Features:
 * - Realtime stock tracking in memory (saved to DB only after order confirmation)
 * - Stock deduction when items added to cart
 * - Stock restoration when items removed from cart
 * - Professional layout matching POS interface
 * - Create draft orders
 * - Add items to cart
 * - Confirm and send to kitchen
 * - Track order status
 * - Session context display
 * 
 * @component
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
  is_package?: boolean;
  notes?: string;
  // Store package component details for stock release
  package_components?: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
  }>;
}

interface Package {
  id: string;
  name: string;
  description?: string;
  package_type: string;
  base_price: number;
  vip_price?: number;
  is_active: boolean;
  items?: Array<{
    product_id: string;
    quantity: number;
    product?: {
      id: string;
      name: string;
      current_stock: number;
    };
  }>;
}

export default function SessionOrderFlow({ sessionId, onOrderConfirmed }: SessionOrderFlowProps) {
  const [session, setSession] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [headerContainer, setHeaderContainer] = useState<HTMLElement | null>(null);
  
  // Alert dialog state for stock warnings
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    details?: string[];
    variant: 'error' | 'warning' | 'success' | 'info' | 'stock-error';
  }>({
    open: false,
    title: '',
    variant: 'info',
  });
  
  // Access stock tracker context
  const stockTracker = useStockTracker();
  const { dataBatching, isOnline } = useOfflineRuntime();

  // Find the header container for portal rendering
  useEffect(() => {
    const container = document.getElementById('tab-detail-container');
    setHeaderContainer(container);
  }, []);

  /**
   * Fetch session details
   * Tries IndexedDB first, then falls back to API when online.
   */
  const fetchSession = async () => {
    try {
      // Try IndexedDB cache first for offline support
      const cachedSession = await dataBatching.getSessionById(sessionId);

      if (cachedSession) {
        setSession(cachedSession);
        if (cachedSession.customer) {
          setSelectedCustomer(cachedSession.customer);
        }
        setLoading(false);
        console.log('📊 [SessionOrderFlow] Loaded session from cache:', sessionId);
        return;
      }

      // Fallback to API when online
      if (isOnline) {
        const response = await fetch(`/api/order-sessions/${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setSession(data.data);
          if (data.data.customer) {
            setSelectedCustomer(data.data.customer);
          }
        }
      } else {
        console.error('Session not available offline:', sessionId);
        toast(OfflineToasts.sessionUnavailable());
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      void fetchSession();
    }
  }, [sessionId, dataBatching, isOnline]);

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
      item => item.product_id === product.id && item.unit_price === price && !item.is_package
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
        is_package: false,
      };
      setCart([...cart, item]);
    }
  };

  /**
   * Add package to cart
   * Packages are always added as new items (no quantity increment)
   * 
   * CRITICAL: Validates and reserves stock for ALL component products
   * This prevents overselling when multiple packages/products share inventory
   */
  const addPackageToCart = (pkg: Package, price: number) => {
    // Validate package has items
    if (!pkg.items || pkg.items.length === 0) {
      setAlertDialog({
        open: true,
        title: 'Package Configuration Error',
        description: `Package "${pkg.name}" has no items configured. Please contact management.`,
        variant: 'error',
      });
      console.error('📦 [SessionOrderFlow] Package has no items:', pkg);
      return;
    }

    // Check stock availability for ALL package components
    const stockIssues: string[] = [];
    for (const packageItem of pkg.items) {
      const product = packageItem.product;
      if (!product) {
        console.warn('📦 [SessionOrderFlow] Package item missing product data:', packageItem);
        continue;
      }

      const requiredQuantity = packageItem.quantity;
      if (!stockTracker.hasStock(product.id, requiredQuantity)) {
        const availableStock = stockTracker.getCurrentStock(product.id);
        stockIssues.push(`${product.name}: Need ${requiredQuantity}, Available ${availableStock}`);
      }
    }

    // If any items are out of stock, show detailed error and don't add
    if (stockIssues.length > 0) {
      setAlertDialog({
        open: true,
        title: 'Insufficient Stock',
        description: `Cannot add "${pkg.name}" to cart. The following components don't have enough stock:`,
        details: stockIssues,
        variant: 'stock-error',
      });
      console.warn('📦 [SessionOrderFlow] Package blocked due to insufficient stock:', stockIssues);
      return;
    }

    // All items have sufficient stock - reserve them in StockTracker
    for (const packageItem of pkg.items) {
      const product = packageItem.product;
      if (!product) continue;
      
      stockTracker.reserveStock(product.id, packageItem.quantity);
      console.log(`📦 [SessionOrderFlow] Reserved ${packageItem.quantity}x ${product.name} for package`);
    }

    // Store package component details for stock release later
    const packageComponents = pkg.items.map(packageItem => ({
      product_id: packageItem.product_id,
      product_name: packageItem.product?.name || 'Unknown Product',
      quantity: packageItem.quantity,
    }));

    // Create cart item
    const item: CartItem = {
      package_id: pkg.id,
      item_name: pkg.name,
      quantity: 1,
      unit_price: price,
      subtotal: price,
      total: price,
      is_vip_price: session?.customer?.tier !== 'regular' && pkg.vip_price ? true : false,
      is_package: true,
      package_components: packageComponents,
    };
    
    setCart([...cart, item]);
    console.log('✅ [SessionOrderFlow] Package added to cart with all stock reserved:', pkg.name);
  };

  /**
   * Remove item from cart with stock restoration
   * 
   * For products: Releases reserved stock
   * For packages: Releases reserved stock for ALL component products
   */
  const removeFromCart = (index: number) => {
    const item = cart[index];
    
    if (item.is_package && item.package_components) {
      // Release stock for all package components
      for (const component of item.package_components) {
        stockTracker.releaseStock(component.product_id, component.quantity);
        console.log(`📦 [SessionOrderFlow] Stock released for package component: ${component.product_name} qty: ${component.quantity}`);
      }
      console.log('✅ [SessionOrderFlow] All package component stock released:', item.item_name);
    } else if (item.product_id && !item.is_package) {
      // Release stock for individual product
      stockTracker.releaseStock(item.product_id, item.quantity);
      console.log('📦 [SessionOrderFlow] Stock released:', item.item_name, 'qty:', item.quantity);
    }
    
    setCart(cart.filter((_, i) => i !== index));
  };

  /**
   * Update item quantity with stock adjustment
   */
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    const item = updatedCart[index];
    
    // Packages cannot have quantity adjusted (fixed quantity)
    if (item.is_package) {
      setAlertDialog({
        open: true,
        title: 'Package Quantity Fixed',
        description: 'Package quantity cannot be changed. Please remove the package and add it again if needed.',
        variant: 'warning',
      });
      return;
    }
    
    const quantityDiff = newQuantity - item.quantity;
    
    // Adjust stock based on quantity change (only for products)
    if (item.product_id && !item.is_package) {
      if (quantityDiff > 0) {
        // Increasing quantity - check and reserve more stock
        if (!stockTracker.hasStock(item.product_id, quantityDiff)) {
          const available = stockTracker.getCurrentStock(item.product_id);
          setAlertDialog({
            open: true,
            title: 'Insufficient Stock',
            description: `Cannot increase quantity for "${item.item_name}".`,
            details: [`Available: ${available}, Requested: ${quantityDiff} more`],
            variant: 'stock-error',
          });
          return;
        }
        stockTracker.reserveStock(item.product_id, quantityDiff);
        console.log('📦 [SessionOrderFlow] Additional stock reserved:', item.item_name, 'qty:', quantityDiff);
      } else if (quantityDiff < 0) {
        // Decreasing quantity - release stock
        stockTracker.releaseStock(item.product_id, Math.abs(quantityDiff));
        console.log('📦 [SessionOrderFlow] Stock released:', item.item_name, 'qty:', Math.abs(quantityDiff));
      }
    }
    
    item.quantity = newQuantity;
    item.subtotal = item.unit_price * newQuantity;
    item.total = item.subtotal;
    setCart(updatedCart);
  };

  /**
   * Update item notes
   * Notes are used for special instructions (e.g., "BBQ flavor", "Well done", etc.)
   */
  const updateItemNotes = (index: number, notes: string) => {
    const updatedCart = [...cart];
    updatedCart[index].notes = notes;
    setCart(updatedCart);
  };

  /**
   * Create draft order
   */
  const createDraftOrder = async () => {
    if (cart.length === 0) {
      setAlertDialog({
        open: true,
        title: 'Empty Cart',
        description: 'Please add items to cart before creating an order.',
        variant: 'warning',
      });
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
        setAlertDialog({
          open: true,
          title: 'Order Creation Failed',
          description: data.error || 'Failed to create order. Please try again.',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      setAlertDialog({
        open: true,
        title: 'Order Creation Error',
        description: 'Failed to create order. Please try again.',
        variant: 'error',
      });
    }

    return null;
  };

  /**
   * Confirm order and send to kitchen
   * Offline-first implementation: creates a temp order locally, queues
   * mutations for server sync, and adjusts local stock.
   */
  const confirmOrder = async () => {
    setConfirming(true);

    try {
      if (cart.length === 0) {
        setAlertDialog({
          open: true,
          title: 'Empty Cart',
          description: 'Please add items to cart before confirming an order.',
          variant: 'warning',
        });
        setConfirming(false);
        return;
      }

      // Delegate offline-first order creation to OfflineTabService
      const order = await OfflineTabService.addOrderToTab(
        sessionId,
        cart.map((item) => ({
          product_id: item.product_id,
          package_id: item.package_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          notes: item.notes,
          is_package: item.is_package,
          package_components: item.package_components?.map((comp) => ({
            product_id: comp.product_id,
            product_name: comp.product_name,
            quantity: comp.quantity,
          })),
        }))
      );

      // Clear cart
      setCart([]);

      toast(OfflineToasts.orderConfirmed(isOnline));

      // Callback for parent
      if (onOrderConfirmed) {
        onOrderConfirmed(order.id);
      }

      // Refresh session from latest cache/server
      await fetchSession();
    } catch (error) {
      console.error('❌ [SessionOrderFlow] Failed to confirm order:', error);
      setAlertDialog({
        open: true,
        title: 'Order Confirmation Error',
        description: 'Failed to confirm order. Please try again.',
        variant: 'error',
      });
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
    <div className="relative">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Portal: Render Session Info in Header */}
      {session && headerContainer && createPortal(
        <Card className="shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left: Session Number & Status */}
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{session.session_number}</span>
                    <Badge className="bg-green-600 text-white text-xs">{session.status}</Badge>
                  </div>
                  {session.table && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                      <MapPin className="w-3 h-3" />
                      Table {session.table.table_number}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right: Customer & Total */}
              <div className="flex items-center gap-3">
                {/* Customer Badge */}
                {selectedCustomer ? (
                  <Badge 
                    className={`flex items-center gap-1 cursor-pointer ${getTierBadgeColor(selectedCustomer.tier)}`}
                    onClick={() => setShowCustomerSearch(true)}
                  >
                    {selectedCustomer.tier !== 'regular' && <Star className="w-3 h-3" />}
                    <User className="w-3 h-3" />
                    <span className="hidden sm:inline">{selectedCustomer.full_name}</span>
                    <span className="sm:hidden">{selectedCustomer.full_name.split(' ')[0]}</span>
                    <Edit className="w-3 h-3 ml-1" />
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCustomerSearch(true)}
                    className="h-7 text-xs"
                  >
                    <User className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Select Customer</span>
                    <span className="sm:hidden">Customer</span>
                  </Button>
                )}
                
                {/* Session Total */}
                <div className="text-right">
                  <div className="text-xs text-gray-600">Total</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(session.total_amount || 0)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* VIP Notice (if applicable) */}
            {selectedCustomer && selectedCustomer.tier !== 'regular' && (
              <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800 flex items-center gap-1">
                <Star className="w-3 h-3" />
                {formatTier(selectedCustomer.tier)} - Special pricing applied
              </div>
            )}
          </CardContent>
        </Card>,
        headerContainer
      )}
      
      {/* Responsive Main Layout Container - Optimized height for better space utilization */}
      <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-12rem)]">
        {/* Left Column - Product Selection (Expands on XL screens) */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">

          {/* Product Selector - Takes remaining space and scrolls internally */}
          <div className="flex-1 min-h-0">
            <SessionProductSelector
              customerTier={selectedCustomer?.tier || 'regular'}
              onProductSelect={addToCart}
              onPackageSelect={addPackageToCart}
            />
          </div>
        </div>

        {/* Right Column - Cart & Actions (Responsive width) */}
        <div className="xl:w-[380px] 2xl:w-[420px] flex-shrink-0 min-h-0">
          {renderCartSection()}
        </div>

        {/* Customer Search Dialog */}
        <CustomerSearch
          open={showCustomerSearch}
          onOpenChange={setShowCustomerSearch}
          onSelectCustomer={handleSelectCustomer}
        />
      </div>
    </div>
  );

  /**
   * Render cart section with responsive scrolling
   */
  function renderCartSection() {
    return (
      <div className="h-full flex flex-col gap-3">
        {/* Cart */}
        <Card className="shadow-md flex-1 flex flex-col overflow-hidden min-h-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Current Order
              {cart.length > 0 && (
                <Badge className="bg-blue-600 text-white ml-2">{cart.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No items in cart</p>
                <p className="text-sm">Add items to create an order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className="font-medium text-sm leading-tight line-clamp-2">{item.item_name}</div>
                          {item.is_package && (
                            <Badge className="bg-amber-500 text-white text-xs">PKG</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </div>
                      </div>
                      <div className="font-bold text-blue-600 flex-shrink-0">
                        {formatCurrency(item.total)}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Quantity Controls - Disabled for packages */}
                      {!item.is_package ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="h-7 w-7 p-0"
                          >
                            -
                          </Button>
                          <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="h-7 w-7 p-0"
                          >
                            +
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic">Fixed quantity</div>
                      )}

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(index)}
                        className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Item Notes Input */}
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-3 h-3 text-gray-500" />
                        <Label htmlFor={`item-notes-${index}`} className="text-xs text-gray-600">
                          Special instructions (flavor, cooking style, etc.)
                        </Label>
                      </div>
                      <Input
                        id={`item-notes-${index}`}
                        type="text"
                        placeholder="e.g., BBQ flavor, Well done, Extra spicy..."
                        value={item.notes || ''}
                        onChange={(e) => updateItemNotes(index, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {/* Cart Total - Fixed at bottom */}
          {cart.length > 0 && (
            <CardContent className="border-t bg-gray-50 flex-shrink-0 py-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions - Fixed at bottom */}
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            disabled={cart.length === 0}
            onClick={createDraftOrder}
          >
            <Clock className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Save as Draft</span>
            <span className="sm:hidden">Draft</span>
          </Button>

          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={cart.length === 0 || confirming}
            onClick={confirmOrder}
          >
            {confirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                <span className="hidden sm:inline">Confirming...</span>
                <span className="sm:hidden">Wait...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Confirm & Send</span>
                <span className="sm:hidden">Confirm</span>
              </>
            )}
          </Button>
        </div>

        {/* Alert Dialog for Warnings and Errors */}
        <AlertDialogSimple
          open={alertDialog.open}
          onOpenChange={(open) => setAlertDialog({ ...alertDialog, open })}
          title={alertDialog.title}
          description={alertDialog.description}
          details={alertDialog.details}
          variant={alertDialog.variant}
        />
      </div>
    );
  }
}
