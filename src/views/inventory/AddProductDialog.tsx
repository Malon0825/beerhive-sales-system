'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import ProductForm from './ProductForm';
import { CreateProductDTO } from '@/models/dtos/CreateProductDTO';
import { toast } from '@/lib/hooks/useToast';

/**
 * AddProductDialog Props
 */
interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * AddProductDialog Component
 * Modal dialog for adding new products to inventory
 * 
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog open state changes
 * @param onSuccess - Callback when product is successfully created
 */
export default function AddProductDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AddProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle product creation
   * Calls the API and handles success/error states
   */
  const handleSubmit = async (data: CreateProductDTO) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create product');
      }

      // Show success message
      toast({
        title: 'Product created successfully!',
        description: `${data.name} has been added to inventory.`,
        variant: 'success',
      });

      // Close dialog and trigger success callback
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Failed to create product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog close/cancel
   */
  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product in your inventory. Fill in the required fields marked with *.
          </DialogDescription>
        </DialogHeader>

        <ProductForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
