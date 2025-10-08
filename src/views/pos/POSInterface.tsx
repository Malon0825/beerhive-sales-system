'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/models/entities/Product';
import { Package } from '@/models/entities/Package';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { useCart } from '@/lib/contexts/CartContext';
import { useStockTracker } from '@/lib/contexts/StockTrackerContext';
import { Card } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { Search, Package as PackageIcon, Grid as GridIcon, CheckCircle2 } from 'lucide-react';
import { Input } from '../shared/ui/input';
import CategoryFilter from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import { OrderSummaryPanel } from './components/OrderSummaryPanel';
import { CustomerSearch } from './CustomerSearch';
import { TableSelector } from './TableSelector';
import { PaymentPanel } from './PaymentPanel';
import { SalesReceipt } from './SalesReceipt';

/**
 * POSInterface - Main POS Component
 * 
 * Professional point-of-sale interface with realtime stock tracking.
 * 
 * Features:
 * - Product browsing with realtime stock display
 * - Memory-based stock deduction (saved to DB only after payment)
 * - Professional product cards showing full names
 * - Category-based filtering
 * - Package support
 * - Customer and table selection
 * - Order summary with detailed controls
 * 
 * Stock Management:
 * - Stock deducted in memory when added to cart
 * - Stock restored when removed from cart
 * - Stock reset when cart is cleared
 * - Stock saved to database only after successful payment
 * 
 * @component
 */
export function POSInterface() {
  // State management
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
  const [categories, setCategories] = useState<Array<{id: string; name: string; color_code?: string}>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [cartRestored, setCartRestored] = useState(false);
  
  // Context hooks
  const cart = useCart();
  const stockTracker = useStockTracker();
  
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
   * Initializes stock tracker with loaded products
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
        
        // Initialize stock tracker with loaded products
        stockTracker.initializeStock(result.data);
        console.log('📊 [POSInterface] Stock tracker initialized');
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
   * Handle adding product to cart with stock tracking
   * Reserves stock in memory, adds to cart
   */
  const handleAddProduct = (product: Product) => {
    const currentStock = stockTracker.getCurrentStock(product.id);
    
    // Check if product has stock
    if (!stockTracker.hasStock(product.id, 1)) {
      alert(`${product.name} is out of stock`);
      return;
    }
    
    // Reserve stock in memory (not saved to DB)
    stockTracker.reserveStock(product.id, 1);
    
    // Add to cart
    cart.addItem(product, 1);
    
    console.log('📦 [POSInterface] Product added with stock reservation:', product.name);
  };

  /**
   * Handle removing item from cart with stock restoration
   */
  const handleRemoveItem = (itemId: string) => {
    // Find the item to get product ID
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      // Release reserved stock
      stockTracker.releaseStock(item.product.id, item.quantity);
      console.log('📦 [POSInterface] Stock released for:', item.product.name);
    }
    
    // Remove from cart
    cart.removeItem(itemId);
  };

  /**
   * Handle updating item quantity with stock adjustment
   */
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;
    
    const quantityDiff = newQuantity - item.quantity;
    
    if (quantityDiff > 0) {
      // Increasing quantity - reserve more stock
      if (!stockTracker.hasStock(item.product.id, quantityDiff)) {
        alert(`Insufficient stock for ${item.product.name}`);
        return;
      }
      stockTracker.reserveStock(item.product.id, quantityDiff);
    } else if (quantityDiff < 0) {
      // Decreasing quantity - release stock
      stockTracker.releaseStock(item.product.id, Math.abs(quantityDiff));
    }
    
    // Update cart
    cart.updateQuantity(itemId, newQuantity);
  };

  /**
   * Handle clearing cart with full stock reset
   */
  const handleClearCart = () => {
    // Reset all stock to original values
    stockTracker.resetAllStock();
    console.log('📦 [POSInterface] All stock reset to original values');
    
    // Clear cart
    cart.clearCart();
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
   * Used to determine if out-of-stock products should be hidden
   */
  const isDrinkProduct = (product: Product): boolean => {
    const categoryName = (product as any).category?.name?.toLowerCase() || '';
    return categoryName.includes('beer') || 
           categoryName.includes('beverage') || 
           categoryName.includes('drink') ||
           categoryName.includes('alcohol');
  };

  /**
   * Check if product should be displayed based on realtime stock
   * Uses stock tracker to get current display stock
   */
  const isProductAvailable = (product: Product): boolean => {
    const displayStock = stockTracker.getCurrentStock(product.id);
    
    // If it's a drink, check display stock level
    if (isDrinkProduct(product)) {
      return displayStock > 0;
    }
    // Non-drink products (food, etc.) always available
    return true;
  };

  /**
   * Filter products based on active view, search, category, and stock availability
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

    // Apply stock availability filter (using realtime stock)
    filtered = filtered.filter(p => isProductAvailable(p));

    return filtered;
  }, [products, activeView, searchQuery, selectedCategory, stockTracker]);

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
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Search Bar */}
        <Card className="p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-base"
            />
          </div>
        </Card>

        {/* Main Content Area */}
        <Card className="flex-1 overflow-hidden flex flex-col shadow-md">
          <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden">
            {/* View Toggle Buttons */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeView === 'all' ? 'default' : 'outline'}
                onClick={() => setActiveView('all')}
                size="sm"
                className={activeView === 'all' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <GridIcon className="w-4 h-4 mr-2" />
                All Products
              </Button>
              <Button
                variant={activeView === 'packages' ? 'default' : 'outline'}
                onClick={() => setActiveView('packages')}
                size="sm"
                className={activeView === 'packages' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                <PackageIcon className="w-4 h-4 mr-2" />
                Packages
              </Button>
              <Button
                variant={activeView === 'featured' ? 'default' : 'outline'}
                onClick={() => setActiveView('featured')}
                size="sm"
                className={activeView === 'featured' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                ⭐ Featured
              </Button>
            </div>

            {/* Category Filter - Only show for product views */}
            {activeView !== 'packages' && (
              <CategoryFilter
                selectedCategoryId={selectedCategory}
                onCategoryChange={setSelectedCategory}
                showProductCount={true}
                productCountPerCategory={productCountPerCategory}
              />
            )}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-4">
            {activeView !== 'packages' && (
              <>
                {loading ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-lg">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <GridIcon className="h-20 w-20 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No products found</p>
                    <p className="text-sm mt-2">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        displayStock={stockTracker.getCurrentStock(product.id)}
                        isFeatured={activeView === 'featured'}
                        onClick={handleAddProduct}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Packages View */}
            {activeView === 'packages' && (
              <>
                {packagesLoading ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-lg">Loading packages...</p>
                  </div>
                ) : packages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <PackageIcon className="h-20 w-20 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No packages available</p>
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
                              <div className="flex gap-1 mt-1">
                                {pkg.package_type === 'vip_only' && (
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-600 text-white rounded">VIP Only</span>
                                )}
                                {pkg.package_type === 'promotional' && (
                                  <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-600 text-white rounded">Promo</span>
                                )}
                              </div>
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
          </div>
        </Card>
      </div>

      {/* Right Panel - Order Summary */}
      <div className="w-[420px] flex-shrink-0">
        <OrderSummaryPanel
          items={cart.items}
          customer={cart.customer}
          table={cart.table}
          subtotal={cart.getSubtotal()}
          total={cart.getTotal()}
          isLoading={cart.isLoadingCart}
          onOpenCustomerSearch={() => setShowCustomerSearch(true)}
          onOpenTableSelector={() => setShowTableSelector(true)}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onProceedToPayment={() => setShowPaymentPanel(true)}
          onClearCart={handleClearCart}
        />
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
            <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
