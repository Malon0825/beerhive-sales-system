'use client';

import { Product } from '@/models/entities/Product';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import StockAdjustmentForm from './StockAdjustmentForm';

/**
 * StockAdjustmentDialog Props
 */
interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

/**
 * StockAdjustmentDialog Component
 * Modal dialog for adjusting product stock levels
 * 
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog open state changes
 * @param product - Product to adjust stock for
 * @param onSuccess - Callback when stock is successfully adjusted
 */
export default function StockAdjustmentDialog({ 
  open, 
  onOpenChange, 
  product,
  onSuccess 
}: StockAdjustmentDialogProps) {
  /**
   * Handle successful stock adjustment
   */
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  /**
   * Handle dialog close/cancel
   */
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjust Stock Level</DialogTitle>
          <DialogDescription>
            Make manual adjustments to product inventory. Changes will be tracked in the audit log.
          </DialogDescription>
        </DialogHeader>

        <StockAdjustmentForm
          product={product}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
