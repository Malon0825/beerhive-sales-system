'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/views/shared/ui/radio-group';
import { formatCurrency } from '@/lib/utils/formatters';
import { PaymentMethod } from '@/models/enums/PaymentMethod';

/**
 * CloseTabModal Component
 * Handles payment processing and closing of order sessions
 * 
 * Features:
 * - Payment method selection
 * - Amount tendered input
 * - Automatic change calculation
 * - Payment validation
 * - Receipt generation
 */
interface CloseTabModalProps {
  sessionId: string;
  totalAmount: number;
  sessionNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receiptData: any) => void;
}

export default function CloseTabModal({
  sessionId,
  totalAmount,
  sessionNumber,
  isOpen,
  onClose,
  onSuccess
}: CloseTabModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Calculate change
   */
  const change = amountTendered ? parseFloat(amountTendered) - totalAmount : 0;
  const isValidPayment = change >= 0;

  /**
   * Reset form when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setAmountTendered(totalAmount.toFixed(2));
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, totalAmount]);

  /**
   * Handle payment submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPayment) {
      setError('Amount tendered must be greater than or equal to total');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/order-sessions/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          amount_tendered: parseFloat(amountTendered),
          closed_by: 'current-user-id', // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Show success message briefly before calling callback
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(data.data);
          }
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to close tab');
      }
    } catch (err) {
      console.error('Failed to close tab:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Quick amount buttons
   */
  const quickAmounts = [
    totalAmount,
    Math.ceil(totalAmount / 100) * 100, // Round up to nearest 100
    Math.ceil(totalAmount / 500) * 500, // Round up to nearest 500
    Math.ceil(totalAmount / 1000) * 1000, // Round up to nearest 1000
  ].filter((amount, index, self) => self.indexOf(amount) === index); // Remove duplicates

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Close Tab</h2>
            <p className="text-green-100 text-sm mt-1">{sessionNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            disabled={processing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Message */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">Printing receipt...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Total Amount */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total Amount</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer">
                    <div className="font-medium">Cash</div>
                  </Label>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="font-medium">Card</div>
                  </Label>
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="gcash" id="gcash" />
                  <Label htmlFor="gcash" className="flex-1 cursor-pointer">
                    <div className="font-medium">GCash</div>
                  </Label>
                  <span className="text-blue-600 font-bold text-sm">G</span>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="paymaya" id="paymaya" />
                  <Label htmlFor="paymaya" className="flex-1 cursor-pointer">
                    <div className="font-medium">PayMaya</div>
                  </Label>
                  <span className="text-green-600 font-bold text-sm">PM</span>
                </div>
              </RadioGroup>
            </div>

            {/* Amount Tendered (Cash only) */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-base font-semibold">
                  Amount Tendered
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={totalAmount}
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  className="text-lg h-12"
                  placeholder="Enter amount"
                  required
                />

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountTendered(amount.toFixed(2))}
                      className="text-xs"
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>

                {/* Change Display */}
                {amountTendered && (
                  <div className={`rounded-lg p-4 ${
                    isValidPayment ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="text-sm font-medium mb-1">
                      {isValidPayment ? 'Change' : 'Insufficient Amount'}
                    </div>
                    <div className={`text-2xl font-bold ${
                      isValidPayment ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isValidPayment ? formatCurrency(change) : formatCurrency(Math.abs(change))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing || !isValidPayment}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Process Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
