'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/models/entities/Product';
import { Package } from '@/models/entities/Package';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { useCart } from '@/lib/contexts/CartContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shared/ui/tabs';
import { Card } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { Badge } from '../shared/ui/badge';
import { Search, Grid, List, User, Armchair, CheckCircle, Package as PackageIcon } from 'lucide-react';
import { Input } from '../shared/ui/input';
import CategoryFilter from './components/CategoryFilter';
import { CustomerSearch } from './CustomerSearch';
import { TableSelector } from './TableSelector';
import { PaymentPanel } from './PaymentPanel';
import { SalesReceipt } from './SalesReceipt';
import { fetchOrderForReceipt } from '@/lib/utils/receiptPrinter';

/**
 * POSInterface - Main POS Component
 * Displays product grid and order summary
 * Features:
 * - Product browsing and selection
 * - Customer search and selection
 * - Table assignment
 * - Order summary with cart management
 */
export function POSInterface() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<(Package & { items?: any[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'packages' | 'featured'>('all');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const cart = useCart();
  const [cartRestored, setCartRestored] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string; name: string; color_code?: string}>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // Show loading message if cart items were restored
  useEffect(() => {
    // Wait for cart to finish loading before checking
    if (!cart.isLoadingCart && !cartRestored && cart.items.length > 0) {
      setSuccessMessage(`Welcome back! Your cart has been restored with ${cart.items.length} item(s).`);
      setCartRestored(true);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    }
  }, [cart.isLoadingCart, cart.items.length, cartRestored]);
  
  // Refs to prevent duplicate API calls
  const fetchingProductsRef = useRef(false);
  const fetchingPackagesRef = useRef(false);
  const hasFetchedRef = useRef(false);

  /**
   * Track component mount/unmount for debugging
   */
  useEffect(() => {
    console.log('🎬 [POSInterface] Component mounted');
    return () => {
      console.log('🔚 [POSInterface] Component unmounted');
    };
  }, []);

  /**
   * Fetch products and packages from API on mount only
   * Using refs to prevent duplicate calls during React strict mode double-mounting
   */
  useEffect(() => {
    if (hasFetchedRef.current) {
      console.log('⏭️ [POSInterface] Already fetched data, skipping...');
      return;
    }
    
    console.log('📥 [POSInterface] Fetching initial data...');
    hasFetchedRef.current = true;
    fetchProducts();
    fetchPackages();
    fetchCategories();
  }, []);

  /**
   * Fetch products from API with duplicate call prevention
   */
  const fetchProducts = async () => {
    if (fetchingProductsRef.current) {
      console.log('⏭️ [POSInterface] Products fetch already in progress, skipping...');
      return;
    }
    
    try {
      fetchingProductsRef.current = true;
      setLoading(true);
      console.log('🔄 [POSInterface] Fetching products...');
      
      const response = await fetch('/api/products');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [POSInterface] Products fetched:', result.data.length);
        setProducts(result.data);
      } else {
        console.error('❌ [POSInterface] Failed to fetch products:', result);
      }
    } catch (error) {
      console.error('❌ [POSInterface] Error fetching products:', error);
    } finally {
      setLoading(false);
      fetchingProductsRef.current = false;
      console.log('🏁 [POSInterface] Products fetch completed');
    }
  };

  /**
   * Fetch categories from API
   * Used to dynamically generate product tabs
   */
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      console.log('🔄 [POSInterface] Fetching categories...');
      
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [POSInterface] Categories fetched:', result.data.length);
        setCategories(result.data || []);
      } else {
        console.error('❌ [POSInterface] Failed to fetch categories:', result);
      }
    } catch (error) {
      console.error('❌ [POSInterface] Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
      console.log('🏁 [POSInterface] Categories fetch completed');
    }
  };

  /**
   * Fetch active packages from API with duplicate call prevention
   */
  const fetchPackages = async () => {
    if (fetchingPackagesRef.current) {
      console.log('⏭️ [POSInterface] Packages fetch already in progress, skipping...');
      return;
    }
    
    try {
      fetchingPackagesRef.current = true;
      setPackagesLoading(true);
      console.log('🔄 [POSInterface] Fetching packages...');
      
      const response = await fetch('/api/packages?active=true');
      const result = await response.json();
      
      console.log('📦 [POSInterface] Packages API Response:', {
        success: result.success,
        count: result.data?.length
      });
      
      if (result.success) {
        console.log('✅ [POSInterface] Packages fetched:', result.data.length);
        if (result.data.length > 0) {
          console.log('📋 [POSInterface] First package:', {
            name: result.data[0].name,
            itemsCount: result.data[0].items?.length
          });
        }
        setPackages(result.data);
      } else {
        console.error('❌ [POSInterface] Failed to fetch packages:', result);
      }
    } catch (error) {
      console.error('❌ [POSInterface] Error fetching packages:', error);
    } finally {
      setPackagesLoading(false);
      fetchingPackagesRef.current = false;
      console.log('🏁 [POSInterface] Packages fetch completed');
    }
  };

  /**
   * Handle customer selection from CustomerSearch dialog
   */
  const handleSelectCustomer = (customer: Customer) => {
    cart.setCustomer(customer);
  };

  /**
   * Handle table selection from TableSelector dialog
   */
  const handleSelectTable = (table: RestaurantTable) => {
    cart.setTable(table);
  };

  /**
   * Handle payment completion
   * Marks the order as completed, fetches order details, and displays receipt for printing
   */
  /**
   * Handle payment completion
   * If previewReceipt is true → show receipt dialog for manual print.
   * If previewReceipt is false (default) → auto-print via receipt API (HTML) without showing dialog.
   */
  const handlePaymentComplete = async (orderId: string, options?: { previewReceipt?: boolean }) => {
    try {
      // Mark order as completed
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });

      if (!response.ok) {
        throw new Error('Failed to complete order');
      }

      const wantsPreview = options?.previewReceipt === true;
      if (wantsPreview) {
        // Preview: open legacy HTML receipt without auto-print
        window.open(
          `/api/orders/${orderId}/receipt?format=html`,
          '_blank',
          'width=400,height=600'
        );
      } else {
        // Auto-print without showing the dialog (department store flow)
        const printWindow = window.open(
          `/api/orders/${orderId}/receipt?format=html`,
          '_blank',
          'width=400,height=600'
        );
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
            printWindow.addEventListener('afterprint', () => {
              try { printWindow.close(); } catch {}
            });
          });
        }
      }
      
      // Show success message
      setSuccessMessage(`Order completed successfully! Order ID: ${orderId}`);
      
      // Clear cart
      cart.clearCart();
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (error) {
      console.error('Error completing order:', error);
      // Still show success but with warning
      setSuccessMessage(`Order created (ID: ${orderId}) but completion failed. Please complete manually.`);
      cart.clearCart();
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 7000);
    }
  };


  /**
   * Handle receipt close
   */
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
  };

  /**
   * Check if a product is a drink/beverage (beer, alcoholic, non-alcoholic)
   * These products should be hidden when out of stock
   * @param product - Product to check
   * @returns true if product is a drink/beverage
   */
  const isDrinkProduct = (product: Product): boolean => {
    const categoryName = (product as any).category?.name?.toLowerCase() || '';
    return categoryName.includes('beer') || 
           categoryName.includes('beverage') || 
           categoryName.includes('drink') ||
           categoryName.includes('alcohol');
  };

  /**
   * Check if product should be visible based on stock
   * Drinks with no stock are hidden, other products always shown
   * @param product - Product to check
   * @returns true if product should be displayed
   */
  const isProductAvailable = (product: Product): boolean => {
    // If it's a drink, check stock level
    if (isDrinkProduct(product)) {
      return product.current_stock > 0;
    }
    // Non-drink products (food, etc.) always available
    return true;
  };

  /**
   * Filter products based on active view, search, and category
   */
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply view filter
    if (activeView === 'featured') {
      filtered = filtered.filter(p => p.is_featured && p.is_active);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    // Apply stock availability filter
    filtered = filtered.filter(p => isProductAvailable(p));

    return filtered;
  }, [products, activeView, searchQuery, selectedCategory]);

  /**
   * Calculate product count per category for CategoryFilter
   */
  const productCountPerCategory = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.filter(p => isProductAvailable(p)).length,
    };

    products.forEach((product) => {
      if (product.category_id && isProductAvailable(product)) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    });

    return counts;
  }, [products]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 relative">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        <Card className="flex-1 overflow-auto p-4">
          {/* View Toggle Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeView === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveView('all')}
              size="sm"
            >
              All Products
            </Button>
            <Button
              variant={activeView === 'packages' ? 'default' : 'outline'}
              onClick={() => setActiveView('packages')}
              size="sm"
            >
              <PackageIcon className="w-4 h-4 mr-1" />
              Packages
            </Button>
            <Button
              variant={activeView === 'featured' ? 'default' : 'outline'}
              onClick={() => setActiveView('featured')}
              size="sm"
            >
              Featured
            </Button>
          </div>

          {/* Category Filter - Only show for product views */}
          {activeView !== 'packages' && (
            <div className="mb-4">
              <CategoryFilter
                selectedCategoryId={selectedCategory}
                onCategoryChange={setSelectedCategory}
                showProductCount={true}
                productCountPerCategory={productCountPerCategory}
              />
            </div>
          )}

          {/* Products View */}
          {activeView !== 'packages' && (
            <>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Grid className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card
                      key={product.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => cart.addItem(product)}
                    >
                      <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center relative">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <Grid className="h-12 w-12 text-gray-400" />
                        )}
                        {activeView === 'featured' && (
                          <Badge className="absolute top-1 right-1 bg-amber-500 text-white text-xs">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                      <p className="text-lg font-bold text-amber-600">
                        ₱{product.base_price.toFixed(2)}
                      </p>
                      {product.current_stock <= product.reorder_point && product.current_stock > 0 && (
                        <p className="text-xs text-red-600 mt-1">Low Stock</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Packages View */}
          {activeView === 'packages' && (
            <>
              {packagesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading packages...</div>
              ) : packages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PackageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No packages available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.map(pkg => {
                    const isVIPOnly = pkg.package_type === 'vip_only';
                    const customerIsVIP = cart.customer && cart.customer.tier !== 'regular';
                    const canPurchase = !isVIPOnly || customerIsVIP;

                    return (
                      <Card
                        key={pkg.id}
                        className={`p-4 transition-all ${
                          canPurchase 
                            ? 'cursor-pointer hover:shadow-lg hover:border-amber-400' 
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => canPurchase && cart.addPackage(pkg)}
                      >
                        {/* Package Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-base mb-1">{pkg.name}</h3>
                            {pkg.package_type === 'vip_only' && (
                              <Badge variant="default" className="bg-purple-600 text-xs">VIP Only</Badge>
                            )}
                            {pkg.package_type === 'promotional' && (
                              <Badge variant="default" className="bg-orange-600 text-xs">Promo</Badge>
                            )}
                          </div>
                          <PackageIcon className="w-6 h-6 text-amber-600" />
                        </div>

                        {/* Package Description */}
                        {pkg.description && (
                          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                        )}

                        {/* Package Items */}
                        <div className="mb-3 space-y-1">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Includes:</p>
                          {pkg.items && pkg.items.slice(0, 3).map((item: any, idx: number) => (
                            <p key={idx} className="text-xs text-gray-600">
                              • {item.quantity}x {item.product?.name || 'Product'}
                            </p>
                          ))}
                          {pkg.items && pkg.items.length > 3 && (
                            <p className="text-xs text-gray-500 italic">
                              +{pkg.items.length - 3} more items
                            </p>
                          )}
                        </div>

                        {/* Package Price */}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Price:</span>
                            <span className="text-lg font-bold text-amber-600">
                              ₱{(customerIsVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price).toFixed(2)}
                            </span>
                          </div>
                          {customerIsVIP && pkg.vip_price && (
                            <p className="text-xs text-purple-600 text-right mt-1">
                              VIP Price Applied!
                            </p>
                          )}
                        </div>

                        {/* Restriction Notice */}
                        {!canPurchase && (
                          <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-2">
                            <p className="text-xs text-purple-800 font-medium">
                              🔒 VIP Membership Required
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Right Panel - Order Summary */}
      <div className="w-96">
        <Card className="h-full flex flex-col p-4">
          <h2 className="text-lg font-bold mb-4">Current Order</h2>

          {/* Customer & Table Info */}
          <div className="mb-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => setShowCustomerSearch(true)}
            >
              <User className="h-4 w-4 mr-2" />
              {cart.customer ? cart.customer.full_name : 'Select Customer'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => setShowTableSelector(true)}
            >
              <Armchair className="h-4 w-4 mr-2" />
              {cart.table ? `Table ${cart.table.table_number}` : 'Select Table'}
            </Button>
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-auto mb-4">
            {cart.isLoadingCart ? (
              <div className="text-center py-8 text-gray-400">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-2"></div>
                <p>Loading cart...</p>
              </div>
            ) : cart.items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <List className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items in cart</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.items.map(item => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">₱{item.unitPrice.toFixed(2)} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cart.removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <span className="ml-auto font-bold">
                        ₱{item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₱{cart.getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>₱0.00</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-amber-600">₱{cart.getTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
              disabled={cart.items.length === 0}
              onClick={() => setShowPaymentPanel(true)}
            >
              Proceed to Payment
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => cart.clearCart()}
                disabled={cart.items.length === 0}
              >
                Clear
              </Button>
              <Button variant="outline" disabled={cart.items.length === 0}>
                Hold
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Search Dialog */}
      <CustomerSearch
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Table Selector Dialog */}
      <TableSelector
        open={showTableSelector}
        onOpenChange={setShowTableSelector}
        onSelectTable={handleSelectTable}
      />

      {/* Payment Panel Dialog */}
      <PaymentPanel
        open={showPaymentPanel}
        onOpenChange={setShowPaymentPanel}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Sales Receipt Dialog */}
      {showReceipt && receiptData && (
        <SalesReceipt
          orderData={receiptData}
          onClose={handleCloseReceipt}
        />
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
            <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
