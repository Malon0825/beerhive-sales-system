'use client';

import { Package } from '@/models/entities/Package';
import { Product } from '@/models/entities/Product';
import PackageForm from './PackageForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';

/**
 * PackageFormDialog Component
 * 
 * Professional dialog wrapper for package create/edit operations
 * 
 * @remarks
 * - Follows Single Responsibility Principle - handles only dialog presentation
 * - Responsive: Full-screen on mobile (<768px), modal on desktop
 * - Proper z-index layering and backdrop blur for professional UX
 * - Keyboard accessible (ESC to close)
 * 
 * Frontend Integration:
 * - Dialog automatically handles overlay, animations, and accessibility
 * - Form validation feedback remains inline within the form
 * - Parent component controls dialog open/close state
 */
interface PackageFormDialogProps {
  /** Controls dialog visibility */
  open: boolean;
  /** Callback when dialog should close (ESC, backdrop click, or cancel) */
  onOpenChange: (open: boolean) => void;
  /** Package data for edit mode, undefined for create mode */
  package?: Package & { items?: any[] };
  /** Available products for package item selection */
  products: Product[];
  /** Form submission handler - receives validated form data */
  onSubmit: (data: any) => void;
  /** Loading state during save operation */
  loading?: boolean;
}

/**
 * PackageFormDialog
 * 
 * Wraps PackageForm in a professional dialog component with:
 * - Backdrop overlay with blur effect
 * - Smooth animations (fade in/out, slide, zoom)
 * - Mobile-responsive (full screen on mobile, centered modal on desktop)
 * - Proper focus management and keyboard navigation
 */
export default function PackageFormDialog({
  open,
  onOpenChange,
  package: existingPackage,
  products,
  onSubmit,
  loading = false,
}: PackageFormDialogProps) {
  /**
   * Handle form cancellation
   * Closes dialog and resets parent state
   */
  const handleCancel = () => {
    onOpenChange(false);
  };

  /**
   * Handle form submission
   * Delegates to parent handler which will close dialog on success
   */
  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* 
          DialogTitle required for accessibility (screen readers)
          Hidden visually as PackageForm has its own title 
        */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            {existingPackage ? 'Edit Package' : 'Create New Package'}
          </DialogTitle>
        </DialogHeader>
        
        {/* Package Form Content */}
        <div className="p-6">
          <PackageForm
            package={existingPackage}
            products={products}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
