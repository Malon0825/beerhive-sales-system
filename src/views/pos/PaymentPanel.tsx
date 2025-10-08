'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '@/models/enums/PaymentMethod';
import { useCart } from '@/lib/contexts/CartContext';
import { apiPost } from '@/lib/utils/apiClient';
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

/**
 * Payment mode: 'pos' for new orders, 'close-tab' for closing existing sessions
 */
type PaymentMode = 'pos' | 'close-tab';

/**
 * Props for PaymentPanel component
 */
interface PaymentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called when payment completes successfully.
   * For POS mode: receives orderId and options
   * For close-tab mode: receives sessionId and result data containing order information
   * options.previewReceipt: if true, show receipt dialog for user to print; if false, auto-print immediately.
   */
  onPaymentComplete: (idOrResult: string | any, options?: { previewReceipt?: boolean; resultData?: any }) => void;
  
  // Close-tab mode specific props
  mode?: PaymentMode;
  sessionId?: string;
  sessionNumber?: string;
  sessionTotal?: number;
  sessionItemCount?: number;
  sessionCustomer?: { id: string; full_name: string };
  sessionTable?: { id: string; table_number: string };
}

/**
 * PaymentPanel Component
 * Unified payment interface for both POS orders and closing tabs
 * 
 * Features:
 * - Supports POS mode (new orders) and close-tab mode (existing sessions)
 * - Cash payment with change calculation
 * - Multiple payment method support
 * - Quick amount selection buttons
 * - Payment validation
 * - Loading and error states
 * - Cohesive design across modules
 * 
 * Payment Methods:
 * - CASH (primary method)
 * - Card, GCash, PayMaya, Bank Transfer (available)
 * 
 * @component
 */
export function PaymentPanel({ 
  open, 
  onOpenChange, 
  onPaymentComplete,
  mode = 'pos',
  sessionId,
  sessionNumber,
  sessionTotal,
  sessionItemCount,
  sessionCustomer,
  sessionTable,
}: PaymentPanelProps) {
  const cart = mode === 'pos' ? useCart() : null;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  // Preview toggle: when unchecked (default), Confirm Payment will auto-print without manual click
  const [previewReceipt, setPreviewReceipt] = useState(false);

  // Get total from cart (POS mode) or session (close-tab mode)
  const total = mode === 'pos' ? (cart?.getTotal() || 0) : (sessionTotal || 0);
  const itemCount = mode === 'pos' ? (cart?.getItemCount() || 0) : (sessionItemCount || 0);
  const customer = mode === 'pos' ? cart?.customer : sessionCustomer;
  const table = mode === 'pos' ? cart?.table : sessionTable;

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
   * All payment methods are available for both POS and close-tab modes
   */
  const paymentMethods = [
    {
      method: PaymentMethod.CASH,
      label: 'Cash',
      icon: Banknote,
      color: 'bg-green-500',
      description: 'Cash payment',
    },
    {
      method: PaymentMethod.CARD,
      label: 'Card',
      icon: CreditCard,
      color: 'bg-blue-500',
      description: 'Credit/Debit Card',
    },
    {
      method: PaymentMethod.GCASH,
      label: 'GCash',
      icon: Smartphone,
      color: 'bg-sky-500',
      description: 'GCash e-wallet',
    },
    {
      method: PaymentMethod.PAYMAYA,
      label: 'PayMaya',
      icon: Smartphone,
      color: 'bg-emerald-500',
      description: 'PayMaya e-wallet',
    },
    {
      method: PaymentMethod.BANK_TRANSFER,
      label: 'Bank Transfer',
      icon: Building2,
      color: 'bg-purple-500',
      description: 'Bank Transfer',
    },
  ];

  /**
   * Validate payment before processing
   * Works for both POS and close-tab modes
   */
  const validateOrder = (): string | null => {
    // Only validate cart for POS mode
    if (mode === 'pos' && cart && cart.items.length === 0) {
      return 'Cart is empty';
    }

    if (!selectedMethod) {
      return 'Please select a payment method';
    }

    // Validate cash payment
    if (selectedMethod === PaymentMethod.CASH) {
      const tendered = parseFloat(amountTendered);
      if (isNaN(tendered) || tendered < total) {
        return 'Amount tendered must be greater than or equal to total';
      }
    }

    // Validate digital payments (require reference number)
    if (
      selectedMethod === PaymentMethod.GCASH ||
      selectedMethod === PaymentMethod.PAYMAYA ||
      selectedMethod === PaymentMethod.BANK_TRANSFER
    ) {
      if (!referenceNumber.trim()) {
        return 'Reference number is required for this payment method';
      }
    }

    return null;
  };

  /**
   * Process payment
   * Handles both POS orders and closing tabs
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

      let response;
      let apiUrl;
      let requestBody;

      if (mode === 'pos') {
        // POS Mode: Create new order
        apiUrl = '/api/orders';
        requestBody = {
          customer_id: cart?.customer?.id,
          table_id: cart?.table?.id,
          items: cart?.items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            notes: item.notes,
          })) || [],
          payment_method: selectedMethod,
          amount_tendered: selectedMethod === PaymentMethod.CASH 
            ? parseFloat(amountTendered) 
            : total,
          change_amount: selectedMethod === PaymentMethod.CASH ? changeAmount : 0,
          notes: referenceNumber ? `Ref: ${referenceNumber}` : undefined,
        };

        console.log('🔍 [PaymentPanel-POS] Creating order:', requestBody);
      } else {
        // Close-Tab Mode: Close existing session
        apiUrl = `/api/order-sessions/${sessionId}/close`;
        requestBody = {
          payment_method: selectedMethod,
          amount_tendered: selectedMethod === PaymentMethod.CASH 
            ? parseFloat(amountTendered) 
            : total,
          reference_number: referenceNumber || undefined,
        };

        console.log('🔍 [PaymentPanel-CloseTab] Closing session:', sessionId);
      }

      // Submit payment using authenticated API client
      const result = await apiPost(apiUrl, requestBody);

      console.log('🔍 [PaymentPanel] API response:', {
        mode,
        success: result.success,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }

      // Success - Close modal and trigger completion handler
      console.log('✅ [PaymentPanel] Payment processed successfully');
      
      // Call completion handler with appropriate data
      // For POS mode: pass orderId from newly created order
      // For close-tab mode: pass sessionId and full result data containing orders
      if (mode === 'pos') {
        const orderId = result.data.id;
        onPaymentComplete(orderId, { previewReceipt });
      } else {
        // Close-tab mode: pass sessionId and result data for receipt printing
        onPaymentComplete(sessionId!, { previewReceipt, resultData: result.data });
      }
      
      // Reset form and close modal
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
        {/* Payment Form */}
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {mode === 'pos' ? 'Complete Payment' : 'Close Tab & Pay'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'pos' 
                  ? 'Select payment method and complete the transaction'
                  : 'Process payment and close the tab'}
              </DialogDescription>
            </DialogHeader>

        {/* Order/Tab Summary */}
        <Card className="p-4 bg-gray-50">
          <h3 className="font-semibold mb-3">
            {mode === 'pos' ? 'Order Summary' : 'Tab Summary'}
          </h3>
          <div className="space-y-2 text-sm">
            {mode === 'close-tab' && sessionNumber && (
              <div className="flex justify-between text-blue-600">
                <span>Tab Number:</span>
                <span className="font-mono">{sessionNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Items ({itemCount}):</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
            {customer && (
              <div className="flex justify-between text-blue-600">
                <span>Customer:</span>
                <span>{customer.full_name}</span>
              </div>
            )}
            {table && (
              <div className="flex justify-between text-amber-600">
                <span>Table:</span>
                <span>Table {table.table_number}</span>
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
        {/* Print Preview Toggle */}
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 select-none text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={previewReceipt}
              onChange={(e) => setPreviewReceipt(e.target.checked)}
              disabled={processing}
            />
            <span>Preview receipt before printing</span>
          </label>
        </div>

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
