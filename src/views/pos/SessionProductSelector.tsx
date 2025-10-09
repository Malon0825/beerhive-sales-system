'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Input } from '@/views/shared/ui/input';
import { Button } from '@/views/shared/ui/button';
import { Search, Package, Loader2, Grid as GridIcon } from 'lucide-react';
import CategoryFilter from './components/CategoryFilter';
import { TabProductCard } from './components/TabProductCard';
import { useStockTracker } from '@/lib/contexts/StockTrackerContext';

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

interface SessionProductSelectorProps {
  customerTier?: string;
  onProductSelect: (product: Product, price: number) => void;
}

export default function SessionProductSelector({ 
  customerTier = 'regular',
  onProductSelect 
}: SessionProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Access stock tracker context
  const stockTracker = useStockTracker();

  /**
   * Fetch active products and initialize stock tracker
   */
  useEffect(() => {
    fetchProducts();
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
          Select Products
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 min-h-0">
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

        {/* Category Filter */}
        <div className="flex-shrink-0">
          <CategoryFilter
            selectedCategoryId={selectedCategory}
            onCategoryChange={setSelectedCategory}
            showProductCount={true}
            productCountPerCategory={productCountPerCategory}
          />
        </div>

        {/* Product Grid - Only this section scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
        </div>
      </CardContent>
    </Card>
  );
}
