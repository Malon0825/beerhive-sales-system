'use client';

import React from 'react';
import { Product } from '@/models/entities/Product';
import { Card } from '@/views/shared/ui/card';
import { Badge } from '@/views/shared/ui/badge';
import { Grid, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Props for ProductCard component
 */
interface ProductCardProps {
  /** Product data to display */
  product: Product;
  /** Current display stock (from stock tracker) */
  displayStock: number;
  /** Whether product is featured */
  isFeatured?: boolean;
  /** Click handler when product is selected */
  onClick: (product: Product) => void;
  /** Whether the card is disabled */
  disabled?: boolean;
}

/**
 * Check if a product is a drink/beverage
 * Used to determine stock visibility rules
 */
const isDrinkProduct = (product: Product): boolean => {
  const categoryName = (product as any).category?.name?.toLowerCase() || '';
  return categoryName.includes('beer') || 
         categoryName.includes('beverage') || 
         categoryName.includes('drink') ||
         categoryName.includes('alcohol');
};

/**
 * ProductCard Component
 * 
 * Displays product information with professional layout.
 * Shows full product name, price, and realtime stock status.
 * 
 * Features:
 * - Full product name visible (no truncation)
 * - Realtime stock display
 * - Stock status indicators (low stock, out of stock)
 * - Featured badge
 * - Category-aware stock warnings
 * - Responsive hover effects
 * 
 * @component
 */
export function ProductCard({
  product,
  displayStock,
  isFeatured = false,
  onClick,
  disabled = false,
}: ProductCardProps) {
  const isDrink = isDrinkProduct(product);
  const isOutOfStock = displayStock <= 0;
  const isLowStock = displayStock > 0 && displayStock <= product.reorder_point;

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

  const handleClick = () => {
    if (!disabled && !isOutOfStock) {
      onClick(product);
    }
  };

  return (
    <Card
      className={`
        p-4 transition-all duration-300 relative overflow-hidden
        animate-in fade-in zoom-in-95
        ${disabled || isOutOfStock 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:shadow-xl hover:scale-105 hover:border-amber-500'
        }
      `}
      onClick={handleClick}
    >
      {/* Featured Badge */}
      {isFeatured && (
        <Badge className="absolute top-2 right-2 bg-amber-500 text-white text-xs z-10">
          ⭐ Featured
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
          <Grid className="h-16 w-16 text-gray-300" />
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        {/* Product Name - Full name visible */}
        <h3 
          className="font-semibold text-sm leading-tight min-h-[2.5rem] line-clamp-2" 
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-amber-600">
            ₱{product.base_price.toFixed(2)}
          </p>
          {product.vip_price && (
            <p className="text-xs text-gray-500 line-through">
              ₱{product.vip_price.toFixed(2)}
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
          <StatusIcon className={`h-4 w-4 ${stockStatus.color}`} />
          <span className={`text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </span>
        </div>

        {/* Category Badge */}
        {(product as any).category?.name && (
          <Badge variant="outline" className="text-xs">
            {(product as any).category.name}
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
