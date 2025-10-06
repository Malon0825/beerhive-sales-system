'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '@/models/enums/PaymentMethod';
import { useCart } from '@/lib/contexts/CartContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../shared/ui/dialog';
import { Input } from '../shared/ui/input';
import { Button } from '../shared/ui/button';
import { Label } from '../shared/ui/label';
import { Card } from '../shared/ui/card';
import { 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Building2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface PaymentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: (orderId: string) => void;
}

/**
 * PaymentPanel Component
 * Handles payment processing for POS orders
 * 
 * Features:
 * - Cash payment with change calculation
 * - Quick amount selection buttons
 * - Order validation before processing
 * - Loading and error states
 * - Success confirmation
 * 
 * Payment Methods:
 * - Currently enabled: CASH only
 * - Disabled: Card, GCash, PayMaya, Bank Transfer (can be enabled by uncommenting in code)
 */
export function PaymentPanel({ open, onOpenChange, onPaymentComplete }: PaymentPanelProps) {
  const cart = useCart();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');

  const total = cart.getTotal();

  /**
   * Calculate change when amount tendered changes
   */
  useEffect(() => {
    if (selectedMethod === PaymentMethod.CASH && amountTendered) {
      const tendered = parseFloat(amountTendered);
      if (!isNaN(tendered) && tendered >= total) {
        setChangeAmount(tendered - total);
      } else {
        setChangeAmount(0);
      }
    }
  }, [amountTendered, total, selectedMethod]);

  /**
   * Payment method configurations
   * NOTE: Currently only CASH payment is enabled
   * Other payment methods (Card, GCash, PayMaya, Bank Transfer) are disabled
   */
  const paymentMethods = [
    {
      method: PaymentMethod.CASH,
      label: 'Cash',
      icon: Banknote,
      color: 'bg-green-500',
      description: 'Cash payment',
    },
    // Disabled payment methods - uncomment to enable
    // {
    //   method: PaymentMethod.CARD,
    //   label: 'Card',
    //   icon: CreditCard,
    //   color: 'bg-blue-500',
    //   description: 'Credit/Debit Card',
    // },
    // {
    //   method: PaymentMethod.GCASH,
    //   label: 'GCash',
    //   icon: Smartphone,
    //   color: 'bg-sky-500',
    //   description: 'GCash e-wallet',
    // },
    // {
    //   method: PaymentMethod.PAYMAYA,
    //   label: 'PayMaya',
    //   icon: Smartphone,
    //   color: 'bg-emerald-500',
    //   description: 'PayMaya e-wallet',
    // },
    // {
    //   method: PaymentMethod.BANK_TRANSFER,
    //   label: 'Bank Transfer',
    //   icon: Building2,
    //   color: 'bg-purple-500',
    //   description: 'Bank Transfer',
    // },
  ];

  /**
   * Validate order before processing payment
   * Currently validates cash-only payments
   */
  const validateOrder = (): string | null => {
    if (cart.items.length === 0) {
      return 'Cart is empty';
    }

    if (!selectedMethod) {
      return 'Please select a payment method';
    }

    // Validate cash payment (currently the only enabled method)
    if (selectedMethod === PaymentMethod.CASH) {
      const tendered = parseFloat(amountTendered);
      if (isNaN(tendered) || tendered < total) {
        return 'Amount tendered must be greater than or equal to total';
      }
    }

    // Note: Digital payment validation removed since only CASH is enabled
    // Uncomment below if you re-enable digital payment methods:
    // if (
    //   selectedMethod === PaymentMethod.GCASH ||
    //   selectedMethod === PaymentMethod.PAYMAYA ||
    //   selectedMethod === PaymentMethod.BANK_TRANSFER
    // ) {
    //   if (!referenceNumber.trim()) {
    //     return 'Reference number is required for this payment method';
    //   }
    // }

    return null;
  };

  /**
   * Process payment and create order
   */
  const handlePayment = async () => {
    // Validate
    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Prepare order data
      const orderData = {
        customer_id: cart.customer?.id,
        table_id: cart.table?.id,
        items: cart.items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        payment_method: selectedMethod,
        amount_tendered: selectedMethod === PaymentMethod.CASH 
          ? parseFloat(amountTendered) 
          : total,
        change_amount: selectedMethod === PaymentMethod.CASH ? changeAmount : 0,
        notes: referenceNumber ? `Ref: ${referenceNumber}` : undefined,
      };

      // Debug: Log order data being sent
      console.log('🔍 [PaymentPanel] Sending order data:', {
        ...orderData,
        table_info: cart.table ? {
          id: cart.table.id,
          table_number: cart.table.table_number,
          status: cart.table.status
        } : 'No table selected'
      });

      // Submit order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      // Debug: Log API response
      console.log('🔍 [PaymentPanel] Order API response:', {
        status: response.status,
        success: result.success,
        order_id: result.data?.id,
        table_id: result.data?.table_id
      });

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }

      // Success
      console.log('✅ [PaymentPanel] Order created successfully, order ID:', result.data.id);
      onPaymentComplete(result.data.id);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Reset form state
   */
  const resetForm = () => {
    setSelectedMethod(null);
    setAmountTendered('');
    setChangeAmount(0);
    setReferenceNumber('');
    setError(null);
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!processing) {
      resetForm();
      onOpenChange(false);
    }
  };

  /**
   * Quick amount buttons for cash payment
   */
  const quickAmounts = [
    total,
    Math.ceil(total / 100) * 100, // Round up to nearest 100
    Math.ceil(total / 500) * 500, // Round up to nearest 500
    Math.ceil(total / 1000) * 1000, // Round up to nearest 1000
  ].filter((amount, index, self) => self.indexOf(amount) === index); // Remove duplicates

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Payment</DialogTitle>
          <DialogDescription>
            Select payment method and complete the transaction
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <Card className="p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items ({cart.getItemCount()}):</span>
              <span>₱{cart.getSubtotal().toFixed(2)}</span>
            </div>
            {cart.customer && (
              <div className="flex justify-between text-blue-600">
                <span>Customer:</span>
                <span>{cart.customer.full_name}</span>
              </div>
            )}
            {cart.table && (
              <div className="flex justify-between text-amber-600">
                <span>Table:</span>
                <span>Table {cart.table.table_number}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-amber-600">₱{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Select Payment Method</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paymentMethods.map(({ method, label, icon: Icon, color, description }) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                disabled={processing}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${
                    selectedMethod === method
                      ? 'border-amber-500 bg-amber-50 shadow-md'
                      : 'border-gray-200 hover:border-amber-300 hover:shadow'
                  }
                  ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`${color} p-3 rounded-full text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs text-gray-500">{description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cash Payment Details */}
        {selectedMethod === PaymentMethod.CASH && (
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amountTendered">Amount Tendered</Label>
              <Input
                id="amountTendered"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className="text-lg"
                autoFocus
                disabled={processing}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-2">
              <Label className="text-sm">Quick Select:</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    onClick={() => setAmountTendered(amount.toString())}
                    disabled={processing}
                    className="text-sm"
                  >
                    ₱{amount.toFixed(0)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Change Display */}
            {amountTendered && parseFloat(amountTendered) >= total && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 font-medium">Change:</span>
                  <span className="text-2xl font-bold text-green-700">
                    ₱{changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Reference Number for Digital Payments */}
        {(selectedMethod === PaymentMethod.GCASH ||
          selectedMethod === PaymentMethod.PAYMAYA ||
          selectedMethod === PaymentMethod.BANK_TRANSFER ||
          selectedMethod === PaymentMethod.CARD) && (
          <Card className="p-4 space-y-2">
            <Label htmlFor="referenceNumber">
              Reference Number {
                selectedMethod !== PaymentMethod.CARD ? '(Required)' : '(Optional)'
              }
            </Label>
            <Input
              id="referenceNumber"
              type="text"
              placeholder="Enter reference/transaction number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              disabled={processing}
            />
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePayment}
            disabled={processing || !selectedMethod}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            {processing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
