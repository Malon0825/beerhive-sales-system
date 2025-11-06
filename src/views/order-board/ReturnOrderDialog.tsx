'use client';

import { useState } from 'react';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { X, AlertTriangle, Package } from 'lucide-react';
import { toast } from '@/lib/hooks/useToast';

/**
 * ReturnOrderDialog Component
 * Handles voiding/returning completed orders with manager authorization
 * Requires manager PIN and return reason for audit trail
 */

interface ReturnOrderDialogProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RETURN_REASONS = [
  'Customer not satisfied',
  'Wrong order delivered',
  'Food quality issue',
  'Service issue',
  'Customer changed mind',
  'Billing error',
  'Other',
];

export default function ReturnOrderDialog({
  orderId,
  orderNumber,
  onClose,
  onSuccess,
}: ReturnOrderDialogProps) {
  const [managerPin, setManagerPin] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle form submission to void the order
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!managerPin) {
      setError('Manager PIN is required');
      return;
    }

    if (!selectedReason) {
      setError('Please select a return reason');
      return;
    }

    if (selectedReason === 'Other' && !otherReason.trim()) {
      setError('Please provide a reason for the return');
      return;
    }

    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;

    try {
      setLoading(true);

      // Call API to void the order
      const response = await fetch(`/api/orders/${orderId}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerPin,
          reason: finalReason,
          isReturn: true, // Flag to indicate this is a return of completed order
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to void order');
      }

      // Success - Show toast notification with inventory restock confirmation
      const inventoryRestocked = data.inventoryRestocked !== false;
      
      toast({
        title: '✅ Order Voided Successfully',
        description: inventoryRestocked ? (
          <div className="flex items-start gap-2">
            <Package className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Inventory Automatically Restocked</p>
              <p className="text-xs text-gray-600 mt-1">
                All items from this order (including package items) have been returned to inventory
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700">Order has been voided</p>
        ),
        variant: 'default',
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Return Order</h2>
              <p className="text-sm text-gray-600">{orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will void a completed order and return inventory.
              This action requires manager authorization and cannot be undone.
            </p>
          </div>

          {/* Return Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Return Reason <span className="text-red-500">*</span>
            </Label>
            <select
              id="reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
              required
            >
              <option value="">Select a reason...</option>
              {RETURN_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Other Reason Input */}
          {selectedReason === 'Other' && (
            <div>
              <Label htmlFor="otherReason" className="text-sm font-medium text-gray-700">
                Please specify <span className="text-red-500">*</span>
              </Label>
              <Input
                id="otherReason"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Enter reason for return..."
                disabled={loading}
                required
                className="mt-1"
              />
            </div>
          )}

          {/* Manager PIN */}
          <div>
            <Label htmlFor="managerPin" className="text-sm font-medium text-gray-700">
              Manager PIN <span className="text-red-500">*</span>
            </Label>
            <Input
              id="managerPin"
              type="password"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              placeholder="Enter manager PIN"
              disabled={loading}
              required
              maxLength={6}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Manager or admin authorization required
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Void Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
