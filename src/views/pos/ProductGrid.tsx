'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { Input } from '@/views/shared/ui/input';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { Search, Package } from 'lucide-react';

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

interface ProductGridProps {
  currentOrderId: string | null;
  cashierId: string;
  customerId?: string | null;
  customerTier?: string;
  onProductAdded?: () => void;
}

/**
 * ProductGrid Component
 * 
 * Displays products in a grid for POS selection
 * **Instantly adds to database** when product is clicked
 * Triggers real-time updates for:
 * - CurrentOrderPanel (POS)
 * - CurrentOrderMonitor (customer-facing page)
 * 
 * Features:
 * - Click product → instant database insert
 * - VIP pricing automatically applied
 * - Stock level indicators
 * - Search/filter products
 * - Category filtering
 */
export function ProductGrid({
  currentOrderId,
  cashierId,
  customerId,
  customerTier = 'regular',
  onProductAdded,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState<string | null>(null);

  /**
   * Fetch products from API
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
   * Handle product click - INSTANT DATABASE INSERT
   * This is the key function that makes items appear in real-time
   */
  const handleProductClick = async (product: Product) => {
    // Must have an active current order
    if (!currentOrderId) {
      alert('Please create an order first');
      return;
    }

    // Check stock
    if (product.current_stock <= 0) {
      alert('Product out of stock');
      return;
    }

    try {
      setAddingProduct(product.id);

      const price = getProductPrice(product);
      const quantity = 1; // Default quantity
      const subtotal = price * quantity;
      const total = subtotal; // No discount by default

      // **INSTANT DATABASE INSERT**
      // This triggers real-time updates immediately
      const response = await fetch(
        `/api/current-orders/${currentOrderId}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cashierId,
            item: {
              product_id: product.id,
              item_name: product.name,
              quantity: quantity,
              unit_price: price,
              subtotal: subtotal,
              discount_amount: 0,
              total: total,
              is_vip_price: isVIP() && product.vip_price ? true : false,
              is_complimentary: false,
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Success! Item added to database
        // Real-time subscription will update:
        // 1. CurrentOrderPanel (this POS)
        // 2. CurrentOrderMonitor (customer page)
        
        if (onProductAdded) {
          onProductAdded();
        }
      } else {
        throw new Error(result.error || 'Failed to add item');
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert(error.message || 'Failed to add product to order');
    } finally {
      setAddingProduct(null);
    }
  };

  /**
   * Filter products by search query and category
   */
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  /**
   * Get unique categories from products
   */
  const categories = Array.from(
    new Set(products.map((p) => p.category_id).filter(Boolean))
  ).map((catId) => {
    const product = products.find((p) => p.category_id === catId);
    return {
      id: catId,
      name: product?.category?.name || 'Unknown',
      color: product?.category?.color_code,
    };
  });

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  /**
   * Get stock badge color
   */
  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    }
    if (stock <= 10) {
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <LoadingSpinner />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        {!currentOrderId && (
          <Badge className="bg-amber-100 text-amber-800">
            Create an order to start adding products
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((category: any) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor:
                  selectedCategory === category.id
                    ? category.color || '#d97706'
                    : undefined,
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const price = getProductPrice(product);
            const isAdding = addingProduct === product.id;
            const outOfStock = product.current_stock <= 0;
            const canAdd = currentOrderId && !outOfStock && !isAdding;

            return (
              <Card
                key={product.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  canAdd
                    ? 'hover:border-amber-500'
                    : 'opacity-60 cursor-not-allowed'
                } ${isAdding ? 'ring-2 ring-amber-500 animate-pulse' : ''}`}
                onClick={() => canAdd && handleProductClick(product)}
              >
                {/* Product Image */}
                {product.image_url ? (
                  <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}

                {/* Product Name */}
                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">
                  {product.name}
                </h3>

                {/* SKU */}
                <p className="text-xs text-gray-500 mb-2">{product.sku}</p>

                {/* Price */}
                <div className="mb-2">
                  {isVIP() && product.vip_price && product.vip_price < product.base_price ? (
                    <div>
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(price)}
                      </div>
                      <div className="text-xs text-gray-400 line-through">
                        {formatCurrency(product.base_price)}
                      </div>
                      <Badge className="text-xs bg-purple-100 text-purple-800 mt-1">
                        VIP Price
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-lg font-bold text-amber-600">
                      {formatCurrency(price)}
                    </div>
                  )}
                </div>

                {/* Stock Badge */}
                <div className="mt-2">{getStockBadge(product.current_stock)}</div>

                {/* Adding Indicator */}
                {isAdding && (
                  <div className="mt-2 text-xs text-amber-600 font-semibold">
                    Adding to order...
                  </div>
                )}

                {/* Out of Stock Overlay */}
                {outOfStock && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                    <span className="text-white font-bold">Out of Stock</span>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
