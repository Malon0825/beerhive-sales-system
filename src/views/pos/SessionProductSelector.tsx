'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Input } from '@/views/shared/ui/input';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { Search, Package, Loader2, Grid as GridIcon } from 'lucide-react';
import CategoryFilter from './components/CategoryFilter';
import { TabProductCard } from './components/TabProductCard';
import { useStockTracker } from '@/lib/contexts/StockTrackerContext';
import { formatCurrency } from '@/lib/utils/formatters';

/**
 * SessionProductSelector Component
 * 
 * Professional product selection interface for TAB module with realtime stock tracking.
 * Displays products in a grid layout with full product names and stock information.
 * 
 * Features:
 * - Realtime stock tracking in memory (saved to DB only after order confirmation)
 * - Grid layout with professional product cards
 * - Full product name visibility
 * - Search and category filtering
 * - VIP pricing support
 * - Stock status indicators
 * - Cohesive design matching POS interface
 * 
 * @component
 */

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  vip_price?: number;
  current_stock: number;
  reorder_point: number;
  category_id?: string;
  image_url?: string;
  is_active: boolean;
  category?: {
    name: string;
    color_code?: string;
  };
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
      name: string;
    };
  }>;
}

interface SessionProductSelectorProps {
  customerTier?: string;
  onProductSelect: (product: Product, price: number) => void;
  onPackageSelect?: (pkg: Package, price: number) => void;
}

export default function SessionProductSelector({ 
  customerTier = 'regular',
  onProductSelect,
  onPackageSelect
}: SessionProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'packages'>('all');
  
  // Access stock tracker context
  const stockTracker = useStockTracker();

  /**
   * Fetch active products, packages, and initialize stock tracker
   */
  useEffect(() => {
    fetchProducts();
    fetchPackages();
  }, []);

  /**
   * Fetch products from API
   * Initializes stock tracker with loaded products
   */
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?isActive=true');
      const result = await response.json();

      if (result.success) {
        const productData = result.data || [];
        setProducts(productData);
        
        // Initialize stock tracker with fetched products
        stockTracker.initializeStock(productData);
        console.log('📊 [SessionProductSelector] Stock tracker initialized with', productData.length, 'products');
      }
    } catch (error) {
      console.error('❌ [SessionProductSelector] Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch active packages from API
   */
  const fetchPackages = async () => {
    try {
      setPackagesLoading(true);
      console.log('🔄 [SessionProductSelector] Fetching packages...');
      
      const response = await fetch('/api/packages?active=true');
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [SessionProductSelector] Packages fetched:', result.data.length);
        setPackages(result.data || []);
      } else {
        console.error('❌ [SessionProductSelector] Failed to fetch packages:', result);
      }
    } catch (error) {
      console.error('❌ [SessionProductSelector] Error fetching packages:', error);
    } finally {
      setPackagesLoading(false);
    }
  };

  /**
   * Check if product is a drink/beverage
   * Drinks have strict stock validation
   */
  const isDrinkProduct = (product: Product): boolean => {
    const categoryName = product.category?.name?.toLowerCase() || '';
    return (
      categoryName.includes('beer') ||
      categoryName.includes('beverage') ||
      categoryName.includes('drink') ||
      categoryName.includes('alcohol')
    );
  };

  /**
   * Check if product should be displayed based on realtime stock
   * Drinks with 0 stock are hidden, food items always shown
   */
  const isProductAvailable = (product: Product): boolean => {
    if (!product.is_active) return false;
    
    const displayStock = stockTracker.getCurrentStock(product.id);
    
    // Hide drinks with no stock
    if (isDrinkProduct(product) && displayStock <= 0) {
      return false;
    }
    
    return true;
  };

  /**
   * Filter products by search query, category, and stock availability
   */
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory || product.category_id === selectedCategory;

      const isAvailable = isProductAvailable(product);

      return matchesSearch && matchesCategory && isAvailable;
    });
  }, [products, searchQuery, selectedCategory, stockTracker]);

  /**
   * Calculate product count per category for display
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
  }, [products, stockTracker]);

  /**
   * Handle product selection with stock reservation
   */
  const handleProductClick = (product: Product, price: number) => {
    const currentStock = stockTracker.getCurrentStock(product.id);
    
    // Check if product has stock
    if (!stockTracker.hasStock(product.id, 1)) {
      alert(`${product.name} is out of stock`);
      return;
    }
    
    // Reserve stock in memory (not saved to DB)
    stockTracker.reserveStock(product.id, 1);
    console.log('📦 [SessionProductSelector] Stock reserved for:', product.name);
    
    // Pass to parent handler
    onProductSelect(product, price);
  };

  /**
   * Handle package selection
   */
  const handlePackageClick = (pkg: Package) => {
    if (!onPackageSelect) {
      console.warn('⚠️ [SessionProductSelector] Package selection handler not provided');
      return;
    }

    // Check if customer tier is VIP for VIP-only packages
    const isVIPOnly = pkg.package_type === 'vip_only';
    const customerIsVIP = customerTier !== 'regular';
    
    if (isVIPOnly && !customerIsVIP) {
      alert('This package is only available for VIP members');
      return;
    }

    // Get price based on customer tier
    const price = customerIsVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price;
    
    console.log('📦 [SessionProductSelector] Package selected:', pkg.name);
    onPackageSelect(pkg, price);
  };

  /**
   * Check if customer is VIP
   */
  const isVIPCustomer = (): boolean => {
    return customerTier !== 'regular';
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="py-12 flex items-center justify-center flex-1">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-md">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          {activeView === 'packages' ? 'Select Packages' : 'Select Products'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 min-h-0">
        {/* View Switcher */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant={activeView === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveView('all')}
            size="sm"
            className={activeView === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}
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
            <Package className="w-4 h-4 mr-2" />
            Packages
          </Button>
        </div>
        {/* Search Bar */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-base"
          />
        </div>

        {/* Category Filter - Only show for product views */}
        {activeView !== 'packages' && (
          <div className="flex-shrink-0">
            <CategoryFilter
              selectedCategoryId={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showProductCount={true}
              productCountPerCategory={productCountPerCategory}
            />
          </div>
        )}

        {/* Product Grid - Only this section scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Products View */}
          {activeView === 'all' && (
            <>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <GridIcon className="h-20 w-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No products found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 pb-6">
                  {filteredProducts.map((product) => (
                    <TabProductCard
                      key={product.id}
                      product={product}
                      displayStock={stockTracker.getCurrentStock(product.id)}
                      customerTier={customerTier}
                      onClick={handleProductClick}
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
                  <Loader2 className="w-16 h-16 animate-spin text-amber-500 mx-auto mb-4" />
                  <p className="text-lg">Loading packages...</p>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package className="h-20 w-20 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No packages available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
                  {packages.map(pkg => {
                    const isVIPOnly = pkg.package_type === 'vip_only';
                    const customerIsVIP = isVIPCustomer();
                    const canPurchase = !isVIPOnly || customerIsVIP;
                    const price = customerIsVIP && pkg.vip_price ? pkg.vip_price : pkg.base_price;

                    return (
                      <Card
                        key={pkg.id}
                        className={`p-4 border-2 transition-all ${
                          canPurchase
                            ? 'cursor-pointer hover:shadow-lg hover:border-amber-400'
                            : 'opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => canPurchase && handlePackageClick(pkg)}
                      >
                        {/* Package Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-base mb-1">{pkg.name}</h3>
                            <div className="flex gap-1 mt-1">
                              {pkg.package_type === 'vip_only' && (
                                <Badge className="bg-purple-600 text-white text-xs">VIP Only</Badge>
                              )}
                              {pkg.package_type === 'promotional' && (
                                <Badge className="bg-orange-600 text-white text-xs">Promo</Badge>
                              )}
                            </div>
                          </div>
                          <Package className="w-6 h-6 text-amber-600" />
                        </div>

                        {/* Package Description */}
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        )}

                        {/* Package Items */}
                        {pkg.items && pkg.items.length > 0 && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-md">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Includes:</p>
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {pkg.items.slice(0, 3).map((item, idx) => (
                                <li key={idx}>
                                  • {item.quantity}x {item.product?.name || 'Product'}
                                </li>
                              ))}
                              {pkg.items.length > 3 && (
                                <li className="text-blue-600 font-medium">
                                  + {pkg.items.length - 3} more items
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Package Price */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            {customerIsVIP && pkg.vip_price && pkg.vip_price < pkg.base_price ? (
                              <div>
                                <div className="text-lg font-bold text-purple-600">
                                  {formatCurrency(price)}
                                </div>
                                <div className="text-xs text-gray-400 line-through">
                                  {formatCurrency(pkg.base_price)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-lg font-bold text-amber-600">
                                {formatCurrency(price)}
                              </div>
                            )}
                          </div>
                          {!canPurchase && (
                            <Badge className="bg-gray-600 text-white text-xs">VIP Required</Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
