'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { supabase } from '@/data/supabase/client';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { AlertCircle } from 'lucide-react';

interface StockAdjustmentFormProps {
  product: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function StockAdjustmentForm({
  product,
  onSuccess,
  onCancel,
}: StockAdjustmentFormProps) {
  const [formData, setFormData] = useState({
    movement_type: 'stock_in',
    reason: 'purchase',
    quantity: '', // Changed from quantity_change - now always absolute value
    unit_cost: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (product) {
      checkAdjustmentRequirements();
    }
  }, [product, formData.quantity, formData.movement_type]);

  /**
   * Get contextual reasons based on selected movement type
   */
  const getAvailableReasons = () => {
    switch (formData.movement_type) {
      case 'stock_in':
        return [
          { value: 'purchase', label: 'Purchase from Supplier' },
          { value: 'void_return', label: 'Void/Return' },
          { value: 'count_correction', label: 'Count Correction (Increase)' },
        ];
      case 'stock_out':
        return [
          { value: 'damaged', label: 'Damaged' },
          { value: 'expired', label: 'Expired' },
          { value: 'theft', label: 'Theft/Loss' },
          { value: 'waste', label: 'Waste/Spillage' },
          { value: 'count_correction', label: 'Count Correction (Decrease)' },
        ];
      case 'physical_count':
        return [
          { value: 'count_correction', label: 'Physical Inventory Count' },
        ];
      default:
        return [];
    }
  };

  /**
   * Calculate new stock based on movement type and quantity
   */
  const calculateNewStock = (): number => {
    if (!product) return 0;
    const qty = parseFloat(formData.quantity) || 0;
    
    switch (formData.movement_type) {
      case 'stock_in':
        return product.current_stock + qty; // Add
      case 'stock_out':
        return product.current_stock - qty; // Subtract
      case 'physical_count':
        return qty; // Set exact amount
      default:
        return product.current_stock;
    }
  };

  /**
   * Calculate actual quantity change for the database
   */
  const calculateQuantityChange = (): number => {
    if (!product) return 0;
    const qty = parseFloat(formData.quantity) || 0;
    
    switch (formData.movement_type) {
      case 'stock_in':
        return qty; // Positive
      case 'stock_out':
        return -qty; // Negative
      case 'physical_count':
        return qty - product.current_stock; // Difference
      default:
        return 0;
    }
  };

  const checkAdjustmentRequirements = () => {
    if (!product) return;

    const newStock = calculateNewStock();
    const quantityChange = calculateQuantityChange();

    // Check for negative stock
    if (newStock < 0) {
      setWarning(`This adjustment would result in negative stock (${newStock.toFixed(2)} ${product.unit_of_measure})`);
    } else if (newStock === 0 && formData.movement_type === 'stock_out') {
      setWarning(`This will reduce stock to zero`);
    } else {
      setWarning(null);
    }

    // Check if requires approval (>10% change)
    const needsApproval = InventoryService.requiresManagerApproval(
      product.current_stock,
      quantityChange
    );
    setRequiresApproval(needsApproval);
  };

  /**
   * Reset reason when movement type changes
   */
  useEffect(() => {
    const reasons = getAvailableReasons();
    if (reasons.length > 0 && !reasons.find(r => r.value === formData.reason)) {
      setFormData(prev => ({ ...prev, reason: reasons[0].value }));
    }
  }, [formData.movement_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);

    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        product_id: product.id,
        quantity_change: calculateQuantityChange(), // Calculated based on movement type
        movement_type: formData.movement_type,
        reason: formData.reason,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost as string) : undefined,
        notes: formData.notes || undefined,
      };

      // Include Authorization header with session token
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else if (result.requiresApproval) {
        alert('This adjustment requires manager approval. Please contact a manager.');
      } else {
        alert(result.error || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Adjust stock error:', error);
      alert('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select a product to adjust stock
      </div>
    );
  }

  const newStock = calculateNewStock();
  const availableReasons = getAvailableReasons();
  const isPhysicalCount = formData.movement_type === 'physical_count';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">SKU:</span>{' '}
            <span className="font-medium">{product.sku}</span>
          </div>
          <div>
            <span className="text-gray-600">Current Stock:</span>{' '}
            <span className="font-medium">
              {product.current_stock} {product.unit_of_measure}
            </span>
          </div>
        </div>
      </div>

      {/* Movement Type */}
      <div>
        <Label>Movement Type *</Label>
        <select
          value={formData.movement_type}
          onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="stock_in">➕ Stock In - Increase Inventory</option>
          <option value="stock_out">➖ Stock Out - Decrease Inventory</option>
          <option value="physical_count">📊 Physical Count - Set Exact Amount</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {formData.movement_type === 'stock_in' && 'Adding inventory (purchases, returns)'}
          {formData.movement_type === 'stock_out' && 'Removing inventory (damage, waste, theft)'}
          {formData.movement_type === 'physical_count' && 'Setting inventory to exact count'}
        </p>
      </div>

      {/* Reason - Contextual based on Movement Type */}
      <div>
        <Label>Reason *</Label>
        <select
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {availableReasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity - Behavior changes based on movement type */}
      <div>
        <Label>
          {isPhysicalCount ? 'Set Stock To *' : 'Quantity *'}
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          required
          placeholder={
            isPhysicalCount 
              ? 'Enter exact stock count' 
              : 'Enter quantity (always positive number)'
          }
        />
        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Current Stock:</span>{' '}
              <span className="font-semibold text-gray-900">
                {product.current_stock.toFixed(2)} {product.unit_of_measure}
              </span>
            </div>
            <div>
              <span className="text-gray-600">New Stock:</span>{' '}
              <span className={`font-bold ${
                newStock < 0 ? 'text-red-600' : 
                newStock === 0 ? 'text-orange-600' : 
                newStock > product.current_stock ? 'text-green-600' : 
                'text-blue-600'
              }`}>
                {newStock.toFixed(2)} {product.unit_of_measure}
              </span>
            </div>
          </div>
          {!isPhysicalCount && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {formData.movement_type === 'stock_in' && `Will add ${parseFloat(formData.quantity) || 0} to stock`}
                {formData.movement_type === 'stock_out' && `Will remove ${parseFloat(formData.quantity) || 0} from stock`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unit Cost */}
      <div>
        <Label>Unit Cost (₱)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formData.unit_cost}
          onChange={(e) =>
            setFormData({ ...formData, unit_cost: e.target.value })
          }
          placeholder="Optional"
        />
      </div>

      {/* Notes */}
      <div>
        <Label>Notes</Label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Additional notes about this adjustment"
        />
      </div>

      {/* Warning Message */}
      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">{warning}</div>
        </div>
      )}

      {/* Requires Approval Warning */}
      {requiresApproval && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            This adjustment requires manager approval due to the significant stock change.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || (!!warning && newStock < 0)}>
          {loading ? 'Adjusting...' : 'Adjust Stock'}
        </Button>
      </div>
    </form>
  );
}
