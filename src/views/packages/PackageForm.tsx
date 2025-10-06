'use client';

import { useState, useEffect } from 'react';
import { Package, CreatePackageInput } from '@/models/entities/Package';
import { Product } from '@/models/entities/Product';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { X, Plus, Trash2 } from 'lucide-react';

interface PackageFormProps {
  package?: Package & { items?: any[] };
  products: Product[];
  onSubmit: (data: CreatePackageInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * PackageForm Component
 * Form for creating and editing packages
 */
export default function PackageForm({
  package: existingPackage,
  products,
  onSubmit,
  onCancel,
  loading = false,
}: PackageFormProps) {
  const [formData, setFormData] = useState<CreatePackageInput>({
    package_code: existingPackage?.package_code || '',
    name: existingPackage?.name || '',
    description: existingPackage?.description || '',
    package_type: existingPackage?.package_type || 'regular',
    base_price: existingPackage?.base_price || '' as any,
    vip_price: existingPackage?.vip_price || undefined,
    valid_from: existingPackage?.valid_from || undefined,
    valid_until: existingPackage?.valid_until || undefined,
    max_quantity_per_transaction: existingPackage?.max_quantity_per_transaction || 1,
    is_addon_eligible: existingPackage?.is_addon_eligible || false,
    items: existingPackage?.items?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      is_choice_item: item.is_choice_item || false,
      choice_group: item.choice_group || undefined,
      display_order: item.display_order || 0,
    })) || [],
  });

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.package_code || !formData.name || !formData.base_price) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item to the package');
      return;
    }

    onSubmit(formData);
  };

  const addItem = () => {
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    const productExists = formData.items.some(item => item.product_id === selectedProductId);
    if (productExists) {
      alert('This product is already in the package');
      return;
    }

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          product_id: selectedProductId,
          quantity: itemQuantity,
          is_choice_item: false,
          display_order: formData.items.length,
        },
      ],
    });

    setSelectedProductId('');
    setItemQuantity(1);
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = quantity;
    setFormData({ ...formData, items: updatedItems });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getProductPrice = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.base_price || 0;
  };

  const calculateTotalValue = () => {
    return formData.items.reduce((total, item) => {
      return total + (getProductPrice(item.product_id) * item.quantity);
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {existingPackage ? 'Edit Package' : 'Create New Package'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel} type="button">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="package_code">Package Code *</Label>
            <Input
              id="package_code"
              value={formData.package_code}
              onChange={(e) => setFormData({ ...formData, package_code: e.target.value })}
              placeholder="PKG-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="name">Package Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ultimate Beer Bucket"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe what's included in this package..."
          />
        </div>

        {/* Package Type and Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="package_type">Package Type *</Label>
            <select
              id="package_type"
              value={formData.package_type}
              onChange={(e) => setFormData({ ...formData, package_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="regular">Regular</option>
              <option value="vip_only">VIP Only</option>
              <option value="promotional">Promotional</option>
            </select>
          </div>

          <div>
            <Label htmlFor="base_price">Base Price (₱) *</Label>
            <Input
              id="base_price"
              type="number"
              step="0.01"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="vip_price">VIP Price (₱)</Label>
            <Input
              id="vip_price"
              type="number"
              step="0.01"
              value={formData.vip_price || ''}
              onChange={(e) => setFormData({ ...formData, vip_price: parseFloat(e.target.value) || undefined })}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="valid_from">Valid From</Label>
            <Input
              id="valid_from"
              type="date"
              value={formData.valid_from || ''}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value || undefined })}
            />
          </div>

          <div>
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until || ''}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value || undefined })}
            />
          </div>

          <div>
            <Label htmlFor="max_quantity">Max Quantity/Transaction</Label>
            <Input
              id="max_quantity"
              type="number"
              min="1"
              value={formData.max_quantity_per_transaction}
              onChange={(e) => setFormData({ ...formData, max_quantity_per_transaction: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        {/* Add-on Eligible */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_addon_eligible"
            checked={formData.is_addon_eligible}
            onChange={(e) => setFormData({ ...formData, is_addon_eligible: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="is_addon_eligible" className="mb-0">Allow add-ons for this package</Label>
        </div>

        {/* Package Items */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Items</h3>
          
          {/* Add Item Form */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="product">Select Product</Label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a product --</option>
                  {products.filter(p => p.is_active).map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ₱{product.base_price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="0.1"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="flex items-end">
                <Button type="button" onClick={addItem} className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {formData.items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items added yet. Add items above.</p>
          ) : (
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{getProductName(item.product_id)}</div>
                    <div className="text-sm text-gray-500">
                      ₱{getProductPrice(item.product_id).toFixed(2)} × {item.quantity} = 
                      ₱{(getProductPrice(item.product_id) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)}
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Items Value:</span>
                  <span className="text-lg font-bold text-blue-600">₱{calculateTotalValue().toFixed(2)}</span>
                </div>
                {formData.base_price > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Package Price:</span>
                    <span className="text-sm font-semibold text-gray-900">₱{formData.base_price.toFixed(2)}</span>
                  </div>
                )}
                {formData.base_price > 0 && calculateTotalValue() > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Savings:</span>
                    <span className="text-sm font-semibold text-green-600">
                      ₱{(calculateTotalValue() - formData.base_price).toFixed(2)} 
                      ({(((calculateTotalValue() - formData.base_price) / calculateTotalValue()) * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : existingPackage ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </div>
    </form>
  );
}
