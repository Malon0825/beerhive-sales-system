'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { InventoryService } from '@/core/services/inventory/InventoryService';
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
    quantity_change: 0,
    unit_cost: 0,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (product) {
      checkAdjustmentRequirements();
    }
  }, [product, formData.quantity_change]);

  const checkAdjustmentRequirements = () => {
    if (!product) return;

    // Validate adjustment
    const validation = InventoryService.validateAdjustment(
      product.current_stock,
      formData.quantity_change,
      formData.movement_type
    );

    if (!validation.valid) {
      setWarning(validation.error || null);
    } else if (validation.error) {
      setWarning(validation.error);
    } else {
      setWarning(null);
    }

    // Check if requires approval
    const needsApproval = InventoryService.requiresManagerApproval(
      product.current_stock,
      formData.quantity_change
    );
    setRequiresApproval(needsApproval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);

    try {
      const payload = {
        product_id: product.id,
        quantity_change: formData.quantity_change,
        movement_type: formData.movement_type,
        reason: formData.reason,
        unit_cost: formData.unit_cost || undefined,
        notes: formData.notes || undefined,
        manager_approved: requiresApproval ? false : undefined, // Would need manager PIN in real implementation
      };

      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const newStock = product.current_stock + formData.quantity_change;

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
          <option value="stock_in">Stock In</option>
          <option value="stock_out">Stock Out</option>
          <option value="transfer">Transfer</option>
          <option value="physical_count">Physical Count</option>
        </select>
      </div>

      {/* Reason */}
      <div>
        <Label>Reason *</Label>
        <select
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="purchase">Purchase</option>
          <option value="damaged">Damaged</option>
          <option value="expired">Expired</option>
          <option value="theft">Theft</option>
          <option value="waste">Waste</option>
          <option value="count_correction">Count Correction</option>
          <option value="transfer_in">Transfer In</option>
          <option value="transfer_out">Transfer Out</option>
        </select>
      </div>

      {/* Quantity Change */}
      <div>
        <Label>Quantity Change *</Label>
        <Input
          type="number"
          step="0.01"
          value={formData.quantity_change}
          onChange={(e) =>
            setFormData({ ...formData, quantity_change: parseFloat(e.target.value) || 0 })
          }
          required
          placeholder="Enter positive for increase, negative for decrease"
        />
        <div className="mt-2 text-sm">
          <span className="text-gray-600">New Stock:</span>{' '}
          <span className={`font-bold ${newStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {newStock.toFixed(2)} {product.unit_of_measure}
          </span>
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
            setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })
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
        <Button type="submit" disabled={loading || (warning && newStock < 0)}>
          {loading ? 'Adjusting...' : 'Adjust Stock'}
        </Button>
      </div>
    </form>
  );
}
