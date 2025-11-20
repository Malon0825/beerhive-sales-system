'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '@/models/enums/PaymentMethod';
import { useCart } from '@/lib/contexts/CartContext';
import { useOfflineRuntime } from '@/lib/contexts/OfflineRuntimeContext';
import { enqueueSyncMutation, decreaseStockForOrder } from '@/lib/data-batching/offlineDb';
import { MutationSyncService } from '@/lib/data-batching/MutationSyncService';
import { OfflineTabService } from '@/services/OfflineTabService';
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
import { toast } from '@/lib/hooks/useToast';
import { createSessionReceiptOrderData, type SessionBillData } from '@/views/orders/sessionReceiptMapper';
import type { OrderSession } from '@/models/entities/OrderSession';
import type { ReceiptOrderData } from './SalesReceipt';

export interface OfflineOrderItemSnapshot {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isPackage: boolean;
  notes?: string;
  packageId?: string | null;
  productId?: string | null;
  packageItems?: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    is_choice_item: boolean;
    choice_group: string | null;
  }>;
}

export interface OfflineOrderSnapshot {
  id: string;
  queueId: number;
  order_number: string;
  created_at: string;
  status: 'pending_sync' | 'synced' | 'failed';
  subtotal: number;
  total: number;
  discount: number;
  payment_method: PaymentMethod | null;
  tableLabel?: string | null;
  customerName?: string | null;
  items: OfflineOrderItemSnapshot[];
}

export type OfflineReceiptPayload = OfflineOrderSnapshot | ReceiptOrderData;

export interface PaymentCompleteOptions {
  resultData?: any;
  isOffline?: boolean;
  queueId?: number;
  localOrder?: OfflineReceiptPayload | null;
}

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
   * For POS mode: receives orderId
   * For close-tab mode: receives sessionId and result data containing order information
   * Receipts are automatically printed upon completion.
   */
  onPaymentComplete: (idOrResult: string | any, options?: PaymentCompleteOptions) => void;
  
  // Close-tab mode specific props
  mode?: PaymentMode;
  sessionId?: string;
  sessionNumber?: string;
  sessionTotal?: number;
  sessionSubtotal?: number;
  sessionExistingDiscount?: number;
  sessionItemCount?: number;
  sessionCustomer?: { id: string; full_name: string };
  sessionTable?: { id: string; table_number: string };
  sessionData?: OrderSession | null;
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
  sessionSubtotal,
  sessionExistingDiscount,
  sessionItemCount,
  sessionCustomer,
  sessionTable,
  sessionData,
}: PaymentPanelProps) {
  const cart = mode === 'pos' ? useCart() : null;
  const { isOnline } = useOfflineRuntime();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('fixed_amount');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Get total from cart (POS mode) or session (close-tab mode)
  const grossSubtotal = mode === 'pos' ? (cart?.getTotal() || 0) : (sessionSubtotal ?? sessionTotal ?? 0);
  const existingDiscount = mode === 'pos' ? 0 : (sessionExistingDiscount || 0);
  const subtotal = Math.max(0, grossSubtotal - existingDiscount);
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = mode === 'pos' ? (cart?.getItemCount() || 0) : (sessionItemCount || 0);
  const customer = mode === 'pos' ? cart?.customer : sessionCustomer;
  const table = mode === 'pos' ? cart?.table : sessionTable;

  const buildOfflineOrderSnapshot = (orderId: string, queueId: number): OfflineOrderSnapshot | null => {
    if (mode !== 'pos' || !cart) {
      return null;
    }

    const createdAt = new Date().toISOString();
    const items = (cart?.items || []).map<OfflineOrderItemSnapshot>((item) => {
      const snapshot: OfflineOrderItemSnapshot = {
        id: item.id,
        name: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        isPackage: item.isPackage,
        notes: item.notes,
        packageId: item.package?.id || null,
        productId: item.product?.id || null,
      };

      // Capture package items metadata for receipt display
      if (item.isPackage && item.package?.items) {
        snapshot.packageItems = item.package.items.map((pi: any) => ({
          product_id: pi.product_id || pi.id,
          product_name: pi.product?.name || pi.name || 'Unknown Item',
          quantity: pi.quantity || 1,
          is_choice_item: pi.is_choice_item || false,
          choice_group: pi.choice_group || null,
        }));
      }

      return snapshot;
    });

    return {
      id: orderId,
      queueId,
      order_number: `OFFLINE-${queueId}`,
      created_at: createdAt,
      status: 'pending_sync',
      subtotal,
      total,
      discount: subtotal - total,
      payment_method: selectedMethod,
      tableLabel: table?.table_number || null,
      customerName: customer?.full_name || null,
      items,
    };
  };

  const calculateSessionDurationMinutes = (): number => {
    if (!sessionData?.opened_at) {
      return 0;
    }
    const opened = new Date(sessionData.opened_at);
    const closed = sessionData.closed_at ? new Date(sessionData.closed_at) : new Date();
    const diff = Math.max(0, closed.getTime() - opened.getTime());
    return Math.floor(diff / 60000);
  };

  const buildOfflineSessionReceiptSnapshot = (): ReceiptOrderData | null => {
    if (mode !== 'close-tab' || !sessionData) {
      return null;
    }

    const orders = sessionData.orders || [];
    const billData: SessionBillData = {
      session: {
        id: sessionData.id,
        session_number: sessionNumber ?? sessionData.session_number,
        opened_at: sessionData.opened_at,
        duration_minutes: calculateSessionDurationMinutes(),
        table: (sessionTable ?? sessionData.table)
          ? {
              table_number: (sessionTable ?? sessionData.table)?.table_number || '',
              area: sessionData.table?.area,
            }
          : undefined,
        customer: (sessionCustomer ?? sessionData.customer)
          ? {
              full_name: (sessionCustomer ?? sessionData.customer)!.full_name,
              customer_number: (sessionData.customer as any)?.customer_number,
              tier: sessionData.customer?.tier,
            }
          : undefined,
      },
      orders: orders.map((order: any) => ({
        id: order.id,
        order_number: order.order_number || order.id,
        status: order.status || 'pending_sync',
        created_at: order.created_at || new Date().toISOString(),
        items: (order.order_items || []).map((item: any) => ({
          item_name: item.item_name || item.name || 'Item',
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price ?? item.price ?? item.total ?? 0,
          total: item.total ?? item.total_amount ?? item.subtotal ?? 0,
          is_complimentary: Boolean(item.is_complimentary),
          is_vip_price: Boolean(item.is_vip_price),
          notes: item.notes ?? item.order_item_note ?? undefined,
        })),
        subtotal: order.subtotal ?? order.total_amount ?? 0,
        discount_amount: order.discount_amount ?? 0,
        total_amount: order.total_amount ?? order.subtotal ?? 0,
      })),
      totals: {
        subtotal: sessionSubtotal ?? sessionData.subtotal ?? 0,
        discount_amount: sessionExistingDiscount ?? sessionData.discount_amount ?? 0,
        tax_amount: sessionData.tax_amount ?? 0,
        total_amount: sessionTotal ?? sessionData.total_amount ?? 0,
      },
    };

    return createSessionReceiptOrderData(billData);
  };

  /**
   * Calculate discount amount when discount value changes
   */
  useEffect(() => {
    const value = parseFloat(discountValue);
    
    if (!discountValue || isNaN(value) || value <= 0) {
      setDiscountAmount(0);
      return;
    }

    if (discountType === 'percentage') {
      // Percentage discount (0-100)
      if (value > 100) {
        setDiscountAmount(0);
        return;
      }
      const calculated = Math.round((subtotal * value) / 100 * 100) / 100;
      setDiscountAmount(Math.min(calculated, subtotal));
    } else {
      // Fixed amount discount
      if (value > subtotal) {
        setDiscountAmount(0);
        return;
      }
      setDiscountAmount(Math.round(value * 100) / 100);
    }
  }, [discountValue, discountType, subtotal]);

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

      const parsedDiscountValue = parseFloat(discountValue);

      if (mode === 'pos') {
        // POS flow: keep existing offline-first order mutation behavior
        const apiUrl = '/api/orders';
        const requestBody: Record<string, unknown> = {
          customer_id: cart?.customer?.id,
          table_id: cart?.table?.id,
          items: cart?.items.map((item) => ({
            product_id: item.isPackage ? undefined : item.product?.id,
            package_id: item.isPackage ? item.package?.id : undefined,
            quantity: item.quantity,
            notes: item.notes,
          })) || [],
          payment_method: selectedMethod,
          amount_tendered:
            selectedMethod === PaymentMethod.CASH ? parseFloat(amountTendered) : total,
          change_amount: selectedMethod === PaymentMethod.CASH ? changeAmount : 0,
          discount_amount: discountAmount > 0 ? discountAmount : undefined,
          discount_type: discountAmount > 0 ? discountType : undefined,
          discount_value:
            discountAmount > 0 && !isNaN(parsedDiscountValue) ? parsedDiscountValue : undefined,
          notes: referenceNumber ? `Ref: ${referenceNumber}` : undefined,
        };

        const mutationPayload = {
          endpoint: apiUrl,
          method: 'POST',
          body: requestBody,
          created_at: new Date().toISOString(),
        };

        const queueId = await enqueueSyncMutation('orders.create', mutationPayload);
        const tempOrderId = `offline-${queueId}-${Date.now()}`;
        const localOrderPayload = buildOfflineOrderSnapshot(tempOrderId, queueId);

        // CRITICAL: Decrease stock locally for immediate UI updates
        if (cart?.items && cart.items.length > 0) {
          try {
            const stockItems = cart.items
              .filter(item => !item.isPackage && item.product?.id)
              .map(item => ({
                productId: item.product!.id,
                quantity: item.quantity,
                itemName: item.itemName,
              }));

            if (stockItems.length > 0) {
              await decreaseStockForOrder(stockItems);
              console.log('✅ [PaymentPanel] Local stock decreased for order');
            }
          } catch (stockError) {
            console.error('⚠️ [PaymentPanel] Failed to decrease local stock:', stockError);
          }
        }

        toast({
          title: '💾 Transaction Queued',
          description: isOnline
            ? 'Synced orders will appear automatically once confirmed.'
            : 'Device is offline. Order will sync when connection returns.',
          variant: 'default',
        });

        onPaymentComplete(tempOrderId, {
          isOffline: true,
          queueId,
          localOrder: localOrderPayload,
        });

        cart?.clearCart();
        resetForm();
        onOpenChange(false);

        if (isOnline) {
          const syncService = MutationSyncService.getInstance();
          void syncService.processPendingMutations();
        }
      } else {
        // Close-tab flow: delegate to OfflineTabService.closeTab
        if (!sessionId) {
          throw new Error('Missing sessionId for close-tab payment');
        }

        const amountTenderedValue =
          selectedMethod === PaymentMethod.CASH ? parseFloat(amountTendered) : total;

        const { queueId } = await OfflineTabService.closeTab(sessionId, {
          amount_tendered: amountTenderedValue,
          payment_method: selectedMethod ?? PaymentMethod.CASH,
          discount_type: discountAmount > 0 ? discountType : undefined,
          discount_value:
            discountAmount > 0 && !isNaN(parsedDiscountValue) ? parsedDiscountValue : undefined,
          notes: referenceNumber || undefined,
        });

        const localOrderPayload = buildOfflineSessionReceiptSnapshot();

        toast({
          title: '💾 Tab Close Queued',
          description: isOnline
            ? 'Tab will sync and close on the server shortly.'
            : 'Device is offline. Tab close will sync when connection returns.',
          variant: 'default',
        });

        onPaymentComplete(sessionId, {
          isOffline: true,
          queueId,
          localOrder: localOrderPayload,
        });

        resetForm();
        onOpenChange(false);
      }
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
    setError(null);
    setReferenceNumber('');
    setDiscountType('percentage');
    setDiscountValue('');
    setDiscountAmount(0);
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
              <span>₱{grossSubtotal.toFixed(2)}</span>
            </div>
            {existingDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Existing Discounts:</span>
                <span>-₱{existingDiscount.toFixed(2)}</span>
              </div>
            )}
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
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>New Discount:</span>
                <span>-₱{discountAmount.toFixed(2)}</span>
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

        {/* Discount Section */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Apply Discount (Optional)</h3>
          
          {/* Discount Type Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={discountType === 'percentage' ? 'default' : 'outline'}
              onClick={() => setDiscountType('percentage')}
              disabled={processing}
              className="flex-1"
            >
              Percentage (%)
            </Button>
            <Button
              type="button"
              variant={discountType === 'fixed_amount' ? 'default' : 'outline'}
              onClick={() => setDiscountType('fixed_amount')}
              disabled={processing}
              className="flex-1"
            >
              Fixed Amount (₱)
            </Button>
          </div>

          {/* Discount Value Input */}
          <div className="space-y-2">
            <Label htmlFor="discountValue">
              {discountType === 'percentage' ? 'Discount Percentage (0-100%)' : 'Discount Amount (₱)'}
            </Label>
            <Input
              id="discountValue"
              type="text"
              inputMode="decimal"
              pattern="^[0-9]*[.,]?[0-9]*$"
              placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 50.00'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              disabled={processing}
              className="text-lg"
            />
            {discountValue && (
              <div className="text-sm">
                {(() => {
                  const value = parseFloat(discountValue);
                  if (isNaN(value) || value <= 0) {
                    return <span className="text-gray-500">Enter a valid discount value</span>;
                  }
                  if (discountType === 'percentage' && value > 100) {
                    return <span className="text-red-600">⚠️ Percentage cannot exceed 100%</span>;
                  }
                  if (discountType === 'fixed_amount' && value > subtotal) {
                    return <span className="text-red-600">⚠️ Discount cannot exceed subtotal</span>;
                  }
                  return (
                    <span className="text-green-600">
                      ✓ Discount: -₱{discountAmount.toFixed(2)} | New Total: ₱{total.toFixed(2)}
                    </span>
                  );
                })()}
              </div>
            )}
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
