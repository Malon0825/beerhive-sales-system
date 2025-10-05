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
import { CreateProductDTO } from '@/models/dtos/CreateProductDTO';
import { Product } from '@/models/entities/Product';
import { Loader2 } from 'lucide-react';

/**
 * Category interface matching database structure
 */
interface Category {
  id: string;
  name: string;
  description: string | null;
  color_code: string | null;
  default_destination: string | null;
}

/**
 * ProductForm Props
 */
interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: CreateProductDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * ProductForm Component
 * Form for creating or editing products with validation
 * 
 * @param product - Optional product for edit mode
 * @param onSubmit - Callback function when form is submitted
 * @param onCancel - Callback function when form is cancelled
 * @param isLoading - Loading state for submit button
 */
export default function ProductForm({ product, onSubmit, onCancel, isLoading = false }: ProductFormProps) {
  const isEditMode = !!product;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state - using empty strings for number fields to allow clearing
  const [formData, setFormData] = useState<any>({
    sku: '',
    name: '',
    description: '',
    category_id: undefined,
    base_price: '',
    vip_price: '',
    cost_price: '',
    current_stock: '',
    unit_of_measure: 'piece',
    reorder_point: '',
    reorder_quantity: '',
    size_variant: '',
    alcohol_percentage: '',
    image_url: '',
    barcode: '',
    is_featured: false,
  });

  /**
   * Load categories and initialize form with product data if editing
   */
  useEffect(() => {
    loadCategories();
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        description: product.description || '',
        category_id: product.category_id || undefined,
        base_price: product.base_price?.toString() || '',
        vip_price: product.vip_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        current_stock: product.current_stock?.toString() || '',
        unit_of_measure: product.unit_of_measure || 'piece',
        reorder_point: product.reorder_point?.toString() || '',
        reorder_quantity: product.reorder_quantity?.toString() || '',
        size_variant: product.size_variant || '',
        alcohol_percentage: product.alcohol_percentage?.toString() || '',
        image_url: product.image_url || '',
        barcode: product.barcode || '',
        is_featured: product.is_featured || false,
      });
    }
  }, [product]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/categories');
      const result = await response.json();
      
      if (result.success) {
        setCategories(result.data);
      } else {
        console.error('Failed to load categories:', result.error);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  /**
   * Handle input change for text, number, and boolean fields
   */
  const handleInputChange = (field: keyof CreateProductDTO, value: string | number | boolean | undefined) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev: Record<string, string>) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validate form data before submission
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    const basePrice = parseFloat(formData.base_price);
    if (!formData.base_price || isNaN(basePrice) || basePrice <= 0) {
      newErrors.base_price = 'Base price must be greater than 0';
    }

    if (formData.vip_price) {
      const vipPrice = parseFloat(formData.vip_price);
      if (!isNaN(vipPrice) && vipPrice >= basePrice) {
        newErrors.vip_price = 'VIP price must be less than base price';
      }
    }

    if (formData.current_stock) {
      const stock = parseFloat(formData.current_stock);
      if (!isNaN(stock) && stock < 0) {
        newErrors.current_stock = 'Stock cannot be negative';
      }
    }

    if (formData.alcohol_percentage) {
      const alcohol = parseFloat(formData.alcohol_percentage);
      if (!isNaN(alcohol) && (alcohol < 0 || alcohol > 100)) {
        newErrors.alcohol_percentage = 'Alcohol percentage must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up the data before submitting - convert strings to numbers
    const cleanedData: CreateProductDTO = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description || undefined,
      barcode: formData.barcode || undefined,
      category_id: formData.category_id || undefined,
      base_price: parseFloat(formData.base_price) || 0,
      vip_price: formData.vip_price ? parseFloat(formData.vip_price) : undefined,
      cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
      current_stock: formData.current_stock ? parseFloat(formData.current_stock) : 0,
      unit_of_measure: formData.unit_of_measure,
      reorder_point: formData.reorder_point ? parseFloat(formData.reorder_point) : 0,
      reorder_quantity: formData.reorder_quantity ? parseFloat(formData.reorder_quantity) : 0,
      size_variant: formData.size_variant || undefined,
      alcohol_percentage: formData.alcohol_percentage ? parseFloat(formData.alcohol_percentage) : undefined,
      image_url: formData.image_url || undefined,
      is_featured: formData.is_featured,
    };

    await onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU <span className="text-red-500">*</span>
            </Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              placeholder="e.g., SMG-001"
              disabled={isLoading}
            />
            {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => handleInputChange('barcode', e.target.value)}
              placeholder="Optional barcode"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Product Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., San Miguel Pale Pilsen"
            disabled={isLoading}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Product description..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => handleInputChange('category_id', value)}
            disabled={isLoading || loadingCategories}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingCategories ? 'Loading categories...' : 'Select a category'} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Pricing</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Base Price */}
          <div className="space-y-2">
            <Label htmlFor="base_price">
              Base Price <span className="text-red-500">*</span>
            </Label>
            <Input
              id="base_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.base_price}
              onChange={(e) => handleInputChange('base_price', e.target.value)}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.base_price && <p className="text-sm text-red-500">{errors.base_price}</p>}
          </div>

          {/* VIP Price */}
          <div className="space-y-2">
            <Label htmlFor="vip_price">VIP Price</Label>
            <Input
              id="vip_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.vip_price}
              onChange={(e) => handleInputChange('vip_price', e.target.value)}
              placeholder="Optional"
              disabled={isLoading}
            />
            {errors.vip_price && <p className="text-sm text-red-500">{errors.vip_price}</p>}
          </div>

          {/* Cost Price */}
          <div className="space-y-2">
            <Label htmlFor="cost_price">Cost Price</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price}
              onChange={(e) => handleInputChange('cost_price', e.target.value)}
              placeholder="Optional"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Inventory</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Current Stock */}
          <div className="space-y-2">
            <Label htmlFor="current_stock">Current Stock</Label>
            <Input
              id="current_stock"
              type="number"
              step="0.01"
              min="0"
              value={formData.current_stock}
              onChange={(e) => handleInputChange('current_stock', e.target.value)}
              placeholder="0"
              disabled={isLoading}
            />
            {errors.current_stock && <p className="text-sm text-red-500">{errors.current_stock}</p>}
          </div>

          {/* Unit of Measure */}
          <div className="space-y-2">
            <Label htmlFor="unit_of_measure">Unit of Measure</Label>
            <Select
              value={formData.unit_of_measure}
              onValueChange={(value) => handleInputChange('unit_of_measure', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="piece">Piece</SelectItem>
                <SelectItem value="bottle">Bottle</SelectItem>
                <SelectItem value="can">Can</SelectItem>
                <SelectItem value="liter">Liter</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reorder Threshold */}
          <div className="space-y-2">
            <Label htmlFor="reorder_point">Reorder Threshold</Label>
            <Input
              id="reorder_point"
              type="number"
              step="0.01"
              min="0"
              value={formData.reorder_point}
              onChange={(e) => handleInputChange('reorder_point', e.target.value)}
              placeholder="0"
              disabled={isLoading}
            />
          </div>

          {/* Reorder Quantity */}
          <div className="space-y-2">
            <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
            <Input
              id="reorder_quantity"
              type="number"
              step="0.01"
              min="0"
              value={formData.reorder_quantity}
              onChange={(e) => handleInputChange('reorder_quantity', e.target.value)}
              placeholder="0"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Additional Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Size Variant */}
          <div className="space-y-2">
            <Label htmlFor="size_variant">Size/Variant</Label>
            <Input
              id="size_variant"
              value={formData.size_variant}
              onChange={(e) => handleInputChange('size_variant', e.target.value)}
              placeholder="e.g., 330ml, Pitcher, Bucket"
              disabled={isLoading}
            />
          </div>

          {/* Alcohol Percentage */}
          <div className="space-y-2">
            <Label htmlFor="alcohol_percentage">Alcohol % (Optional)</Label>
            <Input
              id="alcohol_percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.alcohol_percentage}
              onChange={(e) => handleInputChange('alcohol_percentage', e.target.value)}
              placeholder="e.g., 5.0"
              disabled={isLoading}
            />
            {errors.alcohol_percentage && <p className="text-sm text-red-500">{errors.alcohol_percentage}</p>}
          </div>
        </div>

        {/* Image URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL (Optional)</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => handleInputChange('image_url', e.target.value)}
            placeholder="https://example.com/image.jpg"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Featured Product */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="is_featured" className="text-base font-semibold">
              Featured Product
            </Label>
            <p className="text-sm text-gray-600">
              Featured products appear in the "Featured" tab in POS for quick access
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="is_featured"
                checked={formData.is_featured}
                onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
            <span className={`text-sm font-medium ${formData.is_featured ? 'text-amber-600' : 'text-gray-500'}`}>
              {formData.is_featured ? '⭐ Featured' : 'Not Featured'}
            </span>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Product' : 'Create Product')}
        </Button>
      </div>
    </form>
  );
}
