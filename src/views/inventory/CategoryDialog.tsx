'use client';

import { useState, useEffect } from 'react';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/lib/hooks/useToast';

/**
 * Category form data interface
 * Matches the database structure for product_categories
 */
export interface CategoryFormData {
  id?: string;
  name: string;
  description: string | null;
  color_code: string | null;
  default_destination: 'kitchen' | 'bartender';
}

/**
 * CategoryDialog Props
 */
interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  category?: CategoryFormData | null;
}

/**
 * CategoryDialog Component
 * Reusable dialog for creating or editing product categories
 * 
 * @param open - Controls dialog visibility
 * @param onOpenChange - Callback when dialog open state changes
 * @param onSuccess - Callback when category is successfully created/updated
 * @param mode - Dialog mode: 'create' or 'edit'
 * @param category - Category data for edit mode
 * 
 * @remarks
 * - Single Responsibility: Only handles category form logic
 * - Open/Closed: Mode prop extends functionality without modifying core logic
 * - Validates all inputs before submission
 * - Provides clear error messages for validation failures
 * 
 * Frontend Integration:
 * - Use mode='create' with no category prop for new categories
 * - Use mode='edit' with category prop to edit existing categories
 * - onSuccess callback triggers parent to reload category list
 * - Auto-closes dialog on successful submission
 */
export default function CategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  mode,
  category,
}: CategoryDialogProps) {
  const isEditMode = mode === 'edit';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: null,
    color_code: '#3B82F6',
    default_destination: 'kitchen',
  });

  /**
   * Initialize form data when dialog opens or category changes
   * Reset to defaults for create mode, populate for edit mode
   */
  useEffect(() => {
    if (open) {
      if (isEditMode && category) {
        setFormData({
          id: category.id,
          name: category.name || '',
          description: category.description,
          color_code: category.color_code || '#3B82F6',
          default_destination: category.default_destination || 'kitchen',
        });
      } else {
        // Reset for create mode
        setFormData({
          name: '',
          description: null,
          color_code: '#3B82F6',
          default_destination: 'kitchen',
        });
      }
    }
  }, [open, isEditMode, category]);

  /**
   * Handle form field changes
   * Type-safe updates for each field
   */
  const handleFieldChange = (field: keyof CategoryFormData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Validate form data before submission
   * Returns true if valid, shows error toast if invalid
   * 
   * @remarks
   * - Name is required and must not be empty/whitespace
   * - Color code must be valid hex format
   * - Default destination must be kitchen or bartender
   */
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.color_code && !/^#[0-9A-F]{6}$/i.test(formData.color_code)) {
      toast({
        title: 'Validation Error',
        description: 'Invalid color code format. Use hex format like #3B82F6',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   * Creates or updates category based on mode
   * 
   * @remarks
   * - Validates form before submission
   * - Calls appropriate API endpoint (POST for create, PUT for edit)
   * - Shows success/error toasts
   * - Triggers onSuccess callback to reload category list
   * - Auto-closes dialog on success
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const endpoint = isEditMode
        ? `/api/categories/${formData.id}`
        : '/api/categories';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description?.trim() || null,
          color_code: formData.color_code,
          default_destination: formData.default_destination,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error?.message || result.error || 'Operation failed';
        throw new Error(errorMessage);
      }

      // Show success message
      toast({
        title: isEditMode ? 'Category updated!' : 'Category created!',
        description: isEditMode
          ? `"${formData.name}" has been updated successfully.`
          : `"${formData.name}" has been added to categories.`,
        variant: 'success',
      });

      // Trigger parent callback and close dialog
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} category:`, error);
      toast({
        title: `Failed to ${isEditMode ? 'update' : 'create'} category`,
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle category deletion
   * Soft deletes the category by setting is_active to false
   * 
   * @remarks
   * - Only available in edit mode
   * - Checks if category is used by products
   * - Shows list of products if category is in use
   * - Requires confirmation before deletion
   * - Shows success/error feedback
   * - Triggers onSuccess callback to reload category list
   */
  const handleDelete = async () => {
    if (!category?.id) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Check if error contains product list (category in use)
        if (result.error?.products && Array.isArray(result.error.products)) {
          const productList = result.error.products
            .map((p: any) => `• ${p.name}${p.sku ? ` (${p.sku})` : ''}`)
            .join('\n');
          
          const totalCount = result.error.productCount || result.error.products.length;
          const moreText = totalCount > result.error.products.length 
            ? `\n... and ${totalCount - result.error.products.length} more`
            : '';

          toast({
            title: 'Cannot delete category',
            description: (
              <div className="space-y-2">
                <p className="font-medium">{result.error.message}</p>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Products using this category:</p>
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {productList}{moreText}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Please reassign these products to a different category before deleting.
                </p>
              </div>
            ),
            variant: 'destructive',
            duration: 10000, // Show longer for user to read product list
          });
          
          // Close confirmation dialog but keep edit dialog open
          setShowDeleteConfirm(false);
          return;
        }

        // Other errors
        const errorMessage = result.error?.message || result.error || 'Deletion failed';
        throw new Error(errorMessage);
      }

      // Show success message
      toast({
        title: 'Category deleted!',
        description: `"${category.name}" has been removed from categories.`,
        variant: 'success',
      });

      // Close confirmation dialog
      setShowDeleteConfirm(false);

      // Trigger parent callback and close main dialog
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Failed to delete category',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      // Close confirmation dialog on error
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle dialog close/cancel
   * Only allows closing when not submitting or deleting
   */
  const handleCancel = () => {
    if (!isSubmitting && !isDeleting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the category details. Changes will apply to all products in this category.'
              : 'Add a new product category. This will be available immediately in the category dropdown.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="category-name">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g., Desserts, Appetizers, Sides"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="category-description">Description (Optional)</Label>
            <Input
              id="category-description"
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value.trim() ? e.target.value : null)}
              placeholder="Brief description of the category"
              disabled={isSubmitting}
            />
          </div>

          {/* Color and Destination */}
          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="category-color">Color Code</Label>
              <div className="flex gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={formData.color_code || '#3B82F6'}
                  onChange={(e) => handleFieldChange('color_code', e.target.value)}
                  disabled={isSubmitting}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={formData.color_code || '#3B82F6'}
                  onChange={(e) => handleFieldChange('color_code', e.target.value)}
                  placeholder="#3B82F6"
                  disabled={isSubmitting}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Default Destination */}
            <div className="space-y-2">
              <Label htmlFor="category-destination">Route Orders To</Label>
              <Select
                value={formData.default_destination}
                onValueChange={(value: 'kitchen' | 'bartender') =>
                  handleFieldChange('default_destination', value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">🍳 Kitchen</SelectItem>
                  <SelectItem value="bartender">🍺 Bartender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Delete button - only in edit mode */}
          {isEditMode && (
            <div className="flex-1 flex justify-start">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Category
              </Button>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isDeleting || !formData.name.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting
                ? isEditMode
                  ? 'Updating...'
                  : 'Creating...'
                : isEditMode
                ? 'Update Category'
                : 'Create Category'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{category?.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This action will remove the category from the active category list. Products using this category will keep their category reference, but the category won't appear in dropdowns.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Note:</strong> This is a soft delete and can be restored by an administrator if needed.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
