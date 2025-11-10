'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/views/shared/ui/card';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { Percent, DollarSign, X } from 'lucide-react';

/**
 * Discount type: percentage or fixed amount
 */
export type DiscountType = 'percentage' | 'fixed_amount';

/**
 * Props for DiscountInput component
 */
interface DiscountInputProps {
  /** Current subtotal before discount */
  subtotal: number;
  /** Current discount amount */
  currentDiscount: number;
  /** Callback when discount is applied */
  onApplyDiscount: (discountType: DiscountType, discountValue: number) => Promise<void>;
  /** Callback when discount is removed */
  onRemoveDiscount: () => Promise<void>;
  /** Whether the component is in a loading/processing state */
  disabled?: boolean;
}

/**
 * DiscountInput Component
 * 
 * Provides UI for applying percentage or fixed-amount discounts to orders
 * in the POS system.
 * 
 * Features:
 * - Toggle between percentage and fixed amount discount types
 * - Real-time discount calculation preview
 * - Input validation (percentage 0-100, amount <= subtotal)
 * - Visual feedback for applied discounts
 * - Remove discount functionality
 * 
 * Business Rules:
 * - Percentage must be between 0-100
 * - Fixed amount cannot exceed subtotal
 * - Discount rounds to 2 decimal places
 * - Only one discount can be active at a time
 * 
 * @component
 * @example
 * ```tsx
 * <DiscountInput
 *   subtotal={100}
 *   currentDiscount={10}
 *   onApplyDiscount={async (type, value) => {
 *     await updateOrderDiscount(orderId, type, value);
 *   }}
 *   onRemoveDiscount={async () => {
 *     await removeOrderDiscount(orderId);
 *   }}
 * />
 * ```
 */
export function DiscountInput({
  subtotal,
  currentDiscount,
  onApplyDiscount,
  onRemoveDiscount,
  disabled = false,
}: DiscountInputProps) {
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [calculatedDiscount, setCalculatedDiscount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const hasActiveDiscount = currentDiscount > 0;

  /**
   * Calculate discount amount based on type and value
   */
  useEffect(() => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      setCalculatedDiscount(0);
      setError(null);
      return;
    }

    let discount = 0;
    let validationError: string | null = null;

    if (discountType === 'percentage') {
      if (value > 100) {
        validationError = 'Percentage cannot exceed 100%';
      } else {
        discount = Math.round((subtotal * value) / 100 * 100) / 100;
      }
    } else {
      // fixed_amount
      if (value > subtotal) {
        validationError = 'Discount cannot exceed subtotal';
      } else {
        discount = Math.round(value * 100) / 100;
      }
    }

    setCalculatedDiscount(discount);
    setError(validationError);
  }, [discountValue, discountType, subtotal]);

  /**
   * Handle discount application
   */
  const handleApplyDiscount = async () => {
    const value = parseFloat(discountValue);
    
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid discount value');
      return;
    }

    if (error) {
      return; // Don't apply if there's a validation error
    }

    try {
      setIsApplying(true);
      setError(null);
      await onApplyDiscount(discountType, value);
      
      // Clear input after successful application
      setDiscountValue('');
      setCalculatedDiscount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to apply discount');
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Handle discount removal
   */
  const handleRemoveDiscount = async () => {
    try {
      setIsApplying(true);
      setError(null);
      await onRemoveDiscount();
      setDiscountValue('');
      setCalculatedDiscount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to remove discount');
    } finally {
      setIsApplying(false);
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && !isApplying && !error) {
      handleApplyDiscount();
    }
  };

  return (
    <Card className="p-3 bg-amber-50 border-amber-200">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-gray-700">
            Apply Discount
          </Label>
          {hasActiveDiscount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveDiscount}
              disabled={disabled || isApplying}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-3 h-3 mr-1" />
              Remove
            </Button>
          )}
        </div>

        {/* Show active discount */}
        {hasActiveDiscount && (
          <div className="bg-green-100 border border-green-300 rounded px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">Active Discount:</span>
              <span className="text-green-900 font-bold">
                -₱{currentDiscount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Discount Type Selection */}
        <div className="flex gap-2">
          <button
            onClick={() => setDiscountType('percentage')}
            disabled={disabled || isApplying || hasActiveDiscount}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded border-2 transition-all text-sm font-medium
              ${
                discountType === 'percentage'
                  ? 'border-amber-500 bg-amber-100 text-amber-900'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-amber-300'
              }
              ${(disabled || isApplying || hasActiveDiscount) && 'opacity-50 cursor-not-allowed'}
            `}
          >
            <Percent className="w-4 h-4" />
            Percentage
          </button>
          <button
            onClick={() => setDiscountType('fixed_amount')}
            disabled={disabled || isApplying || hasActiveDiscount}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded border-2 transition-all text-sm font-medium
              ${
                discountType === 'fixed_amount'
                  ? 'border-amber-500 bg-amber-100 text-amber-900'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-amber-300'
              }
              ${(disabled || isApplying || hasActiveDiscount) && 'opacity-50 cursor-not-allowed'}
            `}
          >
            <DollarSign className="w-4 h-4" />
            Fixed Amount
          </button>
        </div>

        {/* Discount Input - Only show if no active discount */}
        {!hasActiveDiscount && (
          <>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={discountType === 'percentage' ? '100' : subtotal.toString()}
                    placeholder={discountType === 'percentage' ? '0.00' : '0.00'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={disabled || isApplying}
                    className="text-right"
                  />
                </div>
                <Button
                  onClick={handleApplyDiscount}
                  disabled={
                    disabled || 
                    isApplying || 
                    !discountValue || 
                    !!error || 
                    calculatedDiscount <= 0
                  }
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isApplying ? 'Applying...' : 'Apply'}
                </Button>
              </div>

              {/* Discount Preview */}
              {calculatedDiscount > 0 && !error && (
                <div className="text-xs text-gray-600 text-right">
                  Discount: -₱{calculatedDiscount.toFixed(2)}
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                {error}
              </div>
            )}
          </>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 leading-tight">
          {hasActiveDiscount
            ? 'Remove the current discount to apply a new one'
            : discountType === 'percentage'
            ? 'Enter percentage (0-100)'
            : 'Enter amount in pesos'}
        </div>
      </div>
    </Card>
  );
}
