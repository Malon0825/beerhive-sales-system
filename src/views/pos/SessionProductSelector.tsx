'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/views/shared/ui/card';
import { Input } from '@/views/shared/ui/input';
import { Badge } from '@/views/shared/ui/badge';
import { Button } from '@/views/shared/ui/button';
import { StockStatusBadge } from '@/views/shared/components/StockStatusBadge';
import { Search, Package, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import CategoryFilter from './components/CategoryFilter';

/**
 * SessionProductSelector Component
 * Product selection interface for tab/session order flow
 * 
 * Features:
 * - Browse active products
 * - Search and filter
 * - Category filtering
 * - VIP pricing support
 * - Stock level indicators
 * - Add products to cart
 */

interface Product {
  id: string;
  name: string;
  sku: string;
  base_price: number;
  vip_price?: number;
  current_stock: number;
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

  /**
   * Fetch active products
   */
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?isActive=true');
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if customer is VIP
   */
  const isVIP = (): boolean => {
    return customerTier !== 'regular';
  };

  /**
   * Get price for product based on customer tier
   */
  const getProductPrice = (product: Product): number => {
    if (isVIP() && product.vip_price) {
      return product.vip_price;
    }
    return product.base_price;
  };

  /**
   * Check if product is a drink/beverage
   * Drinks require strict stock validation
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
   * Check if product should be displayed
   * Drinks with 0 stock are hidden, food items always shown
   */
  const shouldDisplayProduct = (product: Product): boolean => {
    if (!product.is_active) return false;
    
    // Hide drinks with no stock
    if (isDrinkProduct(product) && product.current_stock <= 0) {
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

      const shouldDisplay = shouldDisplayProduct(product);

      return matchesSearch && matchesCategory && shouldDisplay;
    });
  }, [products, searchQuery, selectedCategory]);

  /**
   * Calculate product count per category for display
   */
  const productCountPerCategory = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
    };

    products.forEach((product) => {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    });

    return counts;
  }, [products]);

  /**
   * Handle product selection
   */
  const handleProductClick = (product: Product) => {
    // Check stock for drinks (strict validation)
    if (isDrinkProduct(product) && product.current_stock <= 0) {
      alert('This beverage is out of stock');
      return;
    }

    // Warn for food items with low stock
    if (!isDrinkProduct(product) && product.current_stock <= 0) {
      const confirmed = confirm(
        'This item shows low stock. Kitchen will confirm availability. Continue?'
      );
      if (!confirmed) return;
    }

    const price = getProductPrice(product);
    onProductSelect(product, price);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Select Products
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategoryId={selectedCategory}
          onCategoryChange={setSelectedCategory}
          showProductCount={true}
          productCountPerCategory={productCountPerCategory}
        />

        {/* Product List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No products found</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const price = getProductPrice(product);
              const isDrink = isDrinkProduct(product);
              const outOfStock = isDrink && product.current_stock <= 0;

              return (
                <Card
                  key={product.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'
                  }`}
                  onClick={() => !outOfStock && handleProductClick(product)}
                >
                  <div className="flex items-center gap-3">
                    {/* Product Image */}
                    {product.image_url ? (
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                      
                      {/* Price */}
                      <div className="mt-1">
                        {isVIP() && product.vip_price && product.vip_price < product.base_price ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-600">
                              {formatCurrency(price)}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(product.base_price)}
                            </span>
                            <Badge className="text-xs bg-purple-100 text-purple-800">
                              VIP
                            </Badge>
                          </div>
                        ) : (
                          <span className="font-bold text-blue-600">
                            {formatCurrency(price)}
                          </span>
                        )}
                      </div>

                      {/* Stock Status Badge */}
                      <div className="mt-1">
                        <StockStatusBadge
                          currentStock={product.current_stock}
                          reorderPoint={10}
                          categoryName={product.category?.name || ''}
                          compact
                        />
                      </div>
                    </div>

                    {/* Add Button */}
                    {!outOfStock && (
                      <Button
                        size="sm"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
