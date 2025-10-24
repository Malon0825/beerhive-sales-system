'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/models/entities/Product';
import { Package } from '@/models/entities/Package';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { useCart } from '@/lib/contexts/CartContext';
import { useStockTracker } from '@/lib/contexts/StockTrackerContext';
import { useLocalOrder } from '@/lib/hooks/useLocalOrder';
import { Card } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { Search, Package as PackageIcon, Grid as GridIcon, CheckCircle2 } from 'lucide-react';
import { Input } from '../shared/ui/input';
import CategoryFilter from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import GridColumnSelector from '@/views/shared/ui/GridColumnSelector';
import { OrderSummaryPanel } from './components/OrderSummaryPanel';
import { CustomerSearch } from './CustomerSearch';
import { TableSelector } from './TableSelector';
import { PaymentPanel } from './PaymentPanel';
import { SalesReceipt } from './SalesReceipt';
import { useSessionStorage } from '@/lib/hooks/useSessionStorage';
import { AlertDialogSimple } from '@/views/shared/ui/alert-dialog-simple';

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
  const [topSellingMap, setTopSellingMap] = useState<Record<string, number>>({});
  
  // Grid columns with session storage persistence (default: 5 columns)
  const [gridColumns, setGridColumns] = useSessionStorage<number>('pos-product-grid-columns', 5);
  
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
  
  // Context hooks
  const cart = useCart();
  const stockTracker = useStockTracker();
  const { markOrderAsPaid } = useLocalOrder();

  /**
   * Generate dynamic grid class based on selected columns
   */
  const getGridClass = () => {
    const colMap: Record<number, string> = {
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
    };
    return `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${colMap[gridColumns] || 'lg:grid-cols-5'}`;
  };
  
  // Show loading message if cart items were restored AND re-reserve stock
  useEffect(() => {
    // Wait for products and cart to finish loading before re-reserving
    if (
      loading ||
      cart.isLoadingCart ||
      cartRestorationCompleteRef.current ||
      cart.items.length === 0 ||
      products.length === 0
    ) {
      return;
    }

    let isCancelled = false;

    const reReserveStockForRestoredCart = async () => {
      // Ensure every product in the restored cart is already tracked.
      // If products are still initializing, wait for next render cycle.
      const untrackedProductIds: string[] = [];

      cart.items.forEach(item => {
        const collectUntracked = (productId: string | undefined) => {
          if (!productId) {
            return;
          }
          if (!stockTracker.isProductTracked(productId)) {
            untrackedProductIds.push(productId);
          }
        };

        if (item.product) {
          collectUntracked(item.product.id);
        }

        if (item.package?.items) {
          item.package.items.forEach((pkgItem: any) => {
            collectUntracked(pkgItem.product?.id);
          });
        }
      });

      if (untrackedProductIds.length > 0) {
        console.log('⏳ [POSInterface] Stock tracker not ready for products:', untrackedProductIds);
        return;
      }

      // CRITICAL FIX: Re-reserve stock for all items in restored cart
      // When cart is loaded from IndexedDB, stock tracker is fresh (memory-based)
      // We must re-reserve the stock to prevent double-selling
      console.log('🔄 [POSInterface] Re-reserving stock for', cart.items.length, 'restored cart items');
      
      for (const item of cart.items) {
        if (isCancelled) {
          return;
        }

        if (item.product) {
          // Regular product - reserve stock
          stockTracker.reserveStock(item.product.id, item.quantity);
          console.log(`  ✅ Reserved ${item.quantity}x ${item.product.name} (product)`);
        } else if (item.package) {
          // Package - need to fetch full package data if items not loaded
          if (!item.package.items || item.package.items.length === 0) {
            console.log(`  🔄 Fetching package data for "${item.package.name}"...`);
            try {
              const response = await fetch(`/api/packages/${item.package.id}`);
              const result = await response.json();
              if (result.success && result.data) {
                const fullPackage = result.data;
                // Update cart item with full package data (including items)
                item.package = fullPackage;
                
                // Now reserve stock for components
                if (fullPackage.items && fullPackage.items.length > 0) {
                  fullPackage.items.forEach((pkgItem: any) => {
                    if (pkgItem.product) {
                      const requiredQty = pkgItem.quantity * item.quantity;
                      stockTracker.reserveStock(pkgItem.product.id, requiredQty);
                      console.log(`    ✅ Reserved ${requiredQty}x ${pkgItem.product.name} (package component)`);
                    }
                  });
                }
              }
            } catch (error) {
              console.error(`  ❌ Failed to fetch package data for "${item.package?.name || 'Unknown'}":`, error);
              console.warn('   Stock cannot be reserved. Package should be removed and re-added.');
            }
          } else {
            // Package with items already loaded - reserve stock
            item.package.items.forEach((pkgItem: any) => {
              if (pkgItem.product) {
                const requiredQty = pkgItem.quantity * item.quantity;
                stockTracker.reserveStock(pkgItem.product.id, requiredQty);
                console.log(`  ✅ Reserved ${requiredQty}x ${pkgItem.product.name} (package component)`);
              }
            });
          }
        }
      }
      
      if (!isCancelled) {
        setSuccessMessage(`Welcome back! Your cart has been restored with ${cart.items.length} item(s).`);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 4000);
        cartRestorationCompleteRef.current = true;
      }
    };
    
    reReserveStockForRestoredCart()
      .catch(error => {
        console.error('❌ [POSInterface] Failed to re-reserve stock for restored cart:', error);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    cart.isLoadingCart,
    cart.items.length,
    products.length,
  ]);
  
  // Refs to prevent duplicate API calls
  const fetchingProductsRef = useRef(false);
  const fetchingPackagesRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const cartRestorationCompleteRef = useRef(false);

  /**
   * Track component mount/unmount for debugging and reset restoration flag
   */
  useEffect(() => {
    console.log('🎬 [POSInterface] Component mounted');
    return () => {
      console.log('🔚 [POSInterface] Component unmounted');
      cartRestorationCompleteRef.current = false;
    };
  }, []);

  /**
   * Reset restoration flag when cart is cleared
   */
  useEffect(() => {
    if (cart.items.length === 0 && cartRestorationCompleteRef.current) {
      console.log('🔄 [POSInterface] Cart cleared, resetting restoration flag');
      cartRestorationCompleteRef.current = false;
    }
  }, [cart.items.length]);

  /**
   * Fetch top selling products (last 30 days by default via 'month' period)
   * Used to sort product lists by popularity
   */
  const fetchTopSelling = async () => {
    try {
      const response = await fetch('/api/reports/sales?type=top-products&period=month&limit=500');
      const result = await response.json();
      if (result?.success && Array.isArray(result.data)) {
        const map: Record<string, number> = {};
        for (const item of result.data) {
          const id = item.product_id || item.id;
          if (!id) continue;
          const qty = Number(item.total_quantity ?? item.total_quantity_sold ?? 0);
          map[id] = qty;
        }
        setTopSellingMap(map);
        console.log('📈 [POSInterface] Top-selling map loaded with', Object.keys(map).length, 'items');
      }
    } catch (error) {
      console.error('❌ [POSInterface] Error fetching top products:', error);
    }
  };

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
    fetchTopSelling();
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
      setAlertDialog({
        open: true,
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock.`,
        variant: 'stock-error',
      });
      return;
    }
    
    // Reserve stock in memory (not saved to DB)
    stockTracker.reserveStock(product.id, 1);
    
    // Add to cart
    cart.addItem(product, 1);
    // Clear search to speed up subsequent typing
    setSearchQuery('');
    
    console.log('📦 [POSInterface] Product added with stock reservation:', product.name);
  };

  /**
   * Handle adding package to cart with stock validation
   * Checks stock for all package items before adding
   * Reserves stock in memory for all items
   */
  const handleAddPackage = (pkg: Package & { items?: any[] }) => {
    if (!pkg.items || pkg.items.length === 0) {
      setAlertDialog({
        open: true,
        title: 'Package Configuration Error',
        description: 'This package has no items configured. Please contact management.',
        variant: 'error',
      });
      return;
    }

    // Check stock availability for all package items
    const stockIssues: string[] = [];
    for (const packageItem of pkg.items) {
      const product = packageItem.product;
      if (!product) continue;

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
        description: `Cannot add package "${pkg.name}" to cart. The following components don't have enough stock:`,
        details: stockIssues,
        variant: 'stock-error',
      });
      return;
    }

    // All items have sufficient stock - reserve them
    for (const packageItem of pkg.items) {
      const product = packageItem.product;
      if (!product) continue;
      
      stockTracker.reserveStock(product.id, packageItem.quantity);
      console.log(` [POSInterface] Reserved ${packageItem.quantity}x ${product.name} for package`);
    }

    // Add package to cart
    cart.addPackage(pkg);
    // Clear search to speed up subsequent typing
    setSearchQuery('');
    
    console.log(' [POSInterface] Package added with all stock reserved:', pkg.name);
  };

  /**
   * Handle removing item from cart with stock restoration
   * For products: releases reserved stock
   * For packages: releases reserved stock for all package items
   */
  const handleRemoveItem = (itemId: string) => {
    // Find the item to get product or package ID
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      if (item.isPackage && item.package?.items) {
        // Release stock for all items in the package
        item.package.items.forEach((packageItem: any) => {
          if (packageItem.product?.id) {
            stockTracker.releaseStock(packageItem.product.id, packageItem.quantity * item.quantity);
            console.log('📦 [POSInterface] Stock released for package item:', packageItem.product.name);
          }
        });
      } else if (item.product) {
        // Release reserved stock for regular product
        stockTracker.releaseStock(item.product.id, item.quantity);
        console.log('📦 [POSInterface] Stock released for:', item.product.name);
      }
    }
    
    // Remove from cart
    cart.removeItem(itemId);
  };

  /**
   * Handle updating item quantity with stock adjustment
   * Only applies to regular products, not packages
   */
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Packages don't support quantity changes in this implementation
    if (item.isPackage) {
      console.log('⚠️ [POSInterface] Package quantity changes not supported');
      return;
    }
    
    if (!item.product) return;
    
    const quantityDiff = newQuantity - item.quantity;
    
    if (quantityDiff > 0) {
      // Increasing quantity - reserve more stock
      if (!stockTracker.hasStock(item.product.id, quantityDiff)) {
        const available = stockTracker.getCurrentStock(item.product.id);
        setAlertDialog({
          open: true,
          title: 'Insufficient Stock',
          description: `Cannot increase quantity for "${item.product.name}".`,
          details: [`Available: ${available}, Requested: ${quantityDiff} more`],
          variant: 'stock-error',
        });
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
   * Called after successful payment processing
   * Automatically prints receipt upon order completion
   * 
   * Also marks order as paid in IndexedDB to clear customer display
   */
  const handlePaymentComplete = async (orderId: string) => {
    try {
      // Mark order as completed in database
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });

      if (!response.ok) {
        throw new Error('Failed to complete order');
      }

      // IMPORTANT: Mark order as paid in IndexedDB
      // This will automatically clear the customer display
      if (cart.currentOrderId) {
        try {
          await markOrderAsPaid(cart.currentOrderId);
          console.log('💰 [POSInterface] Order marked as PAID in IndexedDB');
          console.log('🧹 [POSInterface] Customer display will clear automatically');
        } catch (err) {
          console.error('⚠️ [POSInterface] Failed to mark order as paid in IndexedDB:', err);
          // Don't block the flow, order is still completed in database
        }
      }

      // Auto-print receipt immediately
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

    // Sort by popularity (desc), then by name
    return filtered.sort((a, b) => {
      const qa = topSellingMap[a.id] || 0;
      const qb = topSellingMap[b.id] || 0;
      if (qa !== qb) return qb - qa;
      return a.name.localeCompare(b.name);
    });
  }, [products, activeView, searchQuery, selectedCategory, stockTracker, topSellingMap]);

  /**
   * Filter packages by search query for inclusion in 'All Products' view
   */
  const filteredPackagesForAll = useMemo(() => {
    if (!searchQuery) return [] as (Package & { items?: any[] })[];
    const q = searchQuery.toLowerCase();
    return packages.filter((pkg) => {
      if (!pkg.is_active) return false;
      const nameMatch = (pkg.name || '').toLowerCase().includes(q);
      const descMatch = (pkg.description || '').toLowerCase().includes(q);
      return nameMatch || descMatch;
    });
  }, [packages, searchQuery]);

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
        {/* Main Content Area */}
        <Card className="flex-1 overflow-hidden flex flex-col shadow-md">
          <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden space-y-3">
            {/* Top Row: Grid Selector and View Toggle Buttons */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Grid Column Selector */}
              <GridColumnSelector
                columns={gridColumns}
                onColumnsChange={setGridColumns}
              />
              
              {/* Right: View Toggle Buttons */}
              <div className="flex gap-2">
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
            </div>

            {/* Bottom Row: Search Bar and Category Filter */}
            <div className="flex items-center gap-3">
              {/* Left: Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products or packages by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
              
              {/* Right: Category Filter - Only show for product views */}
              <div className="w-64 flex-shrink-0">
                {activeView !== 'packages' ? (
                  <CategoryFilter
                    selectedCategoryId={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    showProductCount={true}
                    productCountPerCategory={productCountPerCategory}
                  />
                ) : (
                  <div></div>
                )}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto p-4">
            {activeView !== 'packages' ? (
              <>
                {loading ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-lg">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 && filteredPackagesForAll.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <GridIcon className="h-20 w-20 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm mt-2">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div 
                    key={`grid-all-${gridColumns}`}
                    className={`${getGridClass()} gap-3 sm:gap-4 transition-all duration-500 ease-in-out`}
                  >
                    {/* Package matches (only shown when searching in 'All Products' view) */}
                    {filteredPackagesForAll.map(pkg => {
                      const isVIPOnly = pkg.package_type === 'vip_only';
                      const customerIsVIP = cart.customer && cart.customer.tier !== 'regular';
                      const canPurchase = !isVIPOnly || !!customerIsVIP;
                      return (
                        <Card
                          key={`pkg-${pkg.id}`}
                          className={`p-4 transition-all duration-300 animate-in fade-in zoom-in-95 ${
                            canPurchase ? 'cursor-pointer hover:shadow-lg hover:border-amber-400' : 'opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => canPurchase && handleAddPackage(pkg)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-base mb-1">{pkg.name}</h3>
                              <div className="flex gap-1 mt-1">
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-500 text-white rounded">PKG</span>
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
                          {pkg.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                          )}
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Price:</span>
                              <span className="text-lg font-bold text-amber-600">
                                ₱{(customerIsVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}

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
            ) : null}

            {/* Packages View */}
            {activeView === 'packages' ? (
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
                  <div 
                    key={`grid-packages-${gridColumns}`}
                    className={`${getGridClass()} gap-4 transition-all duration-500 ease-in-out`}
                  >
                    {packages.map(pkg => {
                      const isVIPOnly = pkg.package_type === 'vip_only';
                      const customerIsVIP = cart.customer && cart.customer.tier !== 'regular';
                      const canPurchase = !isVIPOnly || customerIsVIP;
                      return (
                        <Card
                          key={pkg.id}
                          className={`p-4 transition-all duration-300 animate-in fade-in zoom-in-95 ${
                            canPurchase ? 'cursor-pointer hover:shadow-lg hover:border-amber-400' : 'opacity-60 cursor-not-allowed'
                          }`}
                          onClick={() => canPurchase && handleAddPackage(pkg)}
                        >
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
                          {pkg.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                          )}
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Price:</span>
                              <span className="text-lg font-bold text-amber-600">
                                ₱{(customerIsVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price).toFixed(2)}
                              </span>
                            </div>
                            {customerIsVIP && pkg.vip_price && (
                              <p className="text-xs text-purple-600 text-right mt-1">VIP Price Applied!</p>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
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
      <CustomerSearch open={showCustomerSearch} onOpenChange={setShowCustomerSearch} onSelectCustomer={handleSelectCustomer} />

      {/* Table Selector Dialog */}
      <TableSelector open={showTableSelector} onOpenChange={setShowTableSelector} onSelectTable={handleSelectTable} />

      {/* Payment Panel Dialog */}
      <PaymentPanel open={showPaymentPanel} onOpenChange={setShowPaymentPanel} onPaymentComplete={handlePaymentComplete} />

      {/* Sales Receipt Dialog */}
      {showReceipt && receiptData && (
        <SalesReceipt orderData={receiptData} onClose={handleCloseReceipt} />
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
