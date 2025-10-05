'use client';

import { useState } from 'react';
import { Product } from '@/models/entities/Product';
import ProductForm from './ProductForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import { CreateProductDTO } from '@/models/dtos/CreateProductDTO';

/**
 * EditProductDialog Props
 */
interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * EditProductDialog Component
 * Dialog for editing existing product details including prices, stock, and other information
 * 
 * Features:
 * - Update all product fields (prices, stock, SKU, description, etc.)
 * - Validation before submission
 * - Success/error handling
 * - Loading states
 */
export default function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: EditProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle product update submission
   */
  const handleSubmit = async (data: CreateProductDTO) => {
    if (!product) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error || 'Failed to update product');
      }
    } catch (err) {
      console.error('Update product error:', err);
      setError('An error occurred while updating the product');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleCancel = () => {
    if (!loading) {
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update product details, prices, and inventory information
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}
