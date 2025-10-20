'use client';

import React from 'react';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { Package, AlertCircle, CheckCircle2, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';

/**
 * Product interface for TAB module
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

/**
 * Props for TabProductCard component
 */
interface TabProductCardProps {
  /** Product data to display */
  product: Product;
  /** Current display stock (from stock tracker) */
  displayStock: number;
  /** Customer tier for VIP pricing */
  customerTier?: string;
  /** Click handler when product is selected */
  onClick: (product: Product, price: number) => void;
  /** Whether the card is disabled */
  disabled?: boolean;
}

/**
 * Check if a product is a drink/beverage
 * Used to determine stock visibility rules
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
 * TabProductCard Component
 * 
 * Professional product card for TAB module with realtime stock tracking.
 * Displays full product name, price with VIP support, and stock status.
 * 
 * Features:
 * - Full product name visible (line-clamp-2 for long names)
 * - Realtime stock display from memory
 * - VIP pricing indication
 * - Stock status badges (in stock, low stock, out of stock)
 * - Category-aware stock warnings
 * - Professional hover effects
 * - Cohesive design with POS module
 * 
 * @component
 */
export function TabProductCard({
  product,
  displayStock,
  customerTier = 'regular',
  onClick,
  disabled = false,
}: TabProductCardProps) {
  const isDrink = isDrinkProduct(product);
  const isOutOfStock = displayStock <= 0;
  const isLowStock = displayStock > 0 && displayStock <= product.reorder_point;
  const isVIP = customerTier !== 'regular';
  const price = isVIP && product.vip_price ? product.vip_price : product.base_price;
  const hasVIPDiscount = isVIP && product.vip_price && product.vip_price < product.base_price;

  /**
   * Determine stock status for display
   */
  const getStockStatus = () => {
    if (isOutOfStock) {
      return {
        label: 'Out of Stock',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertCircle,
      };
    }
    if (isLowStock) {
      return {
        label: `Low Stock (${displayStock})`,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: AlertCircle,
      };
    }
    return {
      label: `In Stock (${displayStock})`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
    };
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  /**
   * Handle card click
   */
  const handleClick = () => {
    if (disabled || isOutOfStock) return;
    onClick(product, price);
  };

  return (
    <Card
      className={`
        p-4 transition-all duration-300 relative overflow-hidden
        animate-in fade-in zoom-in-95
        ${
          disabled || isOutOfStock
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-xl hover:scale-105 hover:border-blue-500'
        }
      `}
      onClick={handleClick}
    >
      {/* VIP Badge */}
      {hasVIPDiscount && (
        <Badge className="absolute top-2 right-2 bg-purple-600 text-white text-xs z-10 flex items-center gap-1">
          <Star className="w-3 h-3" />
          VIP Price
        </Badge>
      )}

      {/* Product Image */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-gray-300" />
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        {/* Product Name - Full name visible with line-clamp */}
        <h3
          className="font-semibold text-lg leading-tight min-h-[2.5rem] line-clamp-2"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* SKU */}
        <p className="text-xs text-gray-500">{product.sku}</p>

        {/* Price with VIP Indication */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <p className={`text-xl font-bold ${hasVIPDiscount ? 'text-purple-600' : 'text-blue-600'}`}>
              {formatCurrency(price)}
            </p>
            {hasVIPDiscount && (
              <p className="text-xs text-gray-400 line-through">
                {formatCurrency(product.base_price)}
              </p>
            )}
          </div>
          {hasVIPDiscount && (
            <p className="text-xs text-purple-600 font-medium">
              VIP Discount Applied
            </p>
          )}
        </div>

        {/* Stock Status Badge */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md border
            ${stockStatus.bgColor} ${stockStatus.borderColor}
          `}
        >
          <StatusIcon className={`h-4 w-4 ${stockStatus.color} flex-shrink-0`} />
          <span className={`text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
        </div>

        {/* Category Badge */}
        {product.category?.name && (
          <Badge variant="outline" className="text-xs">
            {product.category.name}
          </Badge>
        )}
      </div>

      {/* Out of Stock Overlay for Drinks */}
      {isOutOfStock && isDrink && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center rounded-lg">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold transform -rotate-12">
            SOLD OUT
          </div>
        </div>
      )}
    </Card>
  );
}
