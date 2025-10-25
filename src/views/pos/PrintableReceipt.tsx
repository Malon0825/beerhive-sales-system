'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Order, OrderItem } from '@/models/entities/Order';
import { format } from 'date-fns';

/**
 * Supported receipt layout variants.
 */
export type ReceiptLayoutVariant = 'branded' | 'minimal';

/**
 * Format date and time for display on receipts.
 *
 * @param dateString - ISO date string received from backend
 * @returns Human-readable formatted timestamp
 */
export const formatReceiptDateTime = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  } catch {
    return dateString;
  }
};

/**
 * Format currency for receipt presentation while handling invalid inputs.
 *
 * @param amount - Numeric amount to format
 * @returns Formatted Peso amount string
 */
export const formatReceiptCurrency = (amount: number | null | undefined) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₱0.00';
  return `₱${n.toFixed(2)}`;
};

interface BusinessInfoState {
  name: string;
  legalName: string;
  registrationNumber: string;
  taxId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  supportContact: string;
  additionalNotes: string;
}

interface ReceiptSettingsState {
  footerMessage: string;
}

interface ReceiptBrandingDetails {
  displayName: string;
  legalName?: string;
  registrationLines: string[];
  addressLines: string[];
  contactLines: string[];
  additionalNotes?: string;
  footerMessage: string;
}

const DEFAULT_BUSINESS_INFO: BusinessInfoState = {
  name: 'BeerHive Pub',
  legalName: '',
  registrationNumber: '',
  taxId: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Philippines',
  phone: '',
  email: '',
  website: '',
  supportContact: '',
  additionalNotes: '',
};

const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsState = {
  footerMessage: 'Thank you for your patronage!',
};

type ParsedSetting = {
  value: any;
  dataType: string;
};

const parseSettingValue = (rawValue: any, dataType: string) => {
  if (rawValue === null || rawValue === undefined) {
    return rawValue;
  }

  switch (dataType) {
    case 'number':
      return Number(rawValue);
    case 'boolean':
      if (typeof rawValue === 'boolean') return rawValue;
      if (typeof rawValue === 'number') return rawValue === 1;
      return String(rawValue).toLowerCase() === 'true' || rawValue === '1';
    case 'json':
      try {
        return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      } catch {
        return rawValue;
      }
    default:
      return String(rawValue);
  }
};

const safeTrim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const buildAddressLines = (info: BusinessInfoState) => {
  const lines: string[] = [];
  const primary = [safeTrim(info.addressLine1), safeTrim(info.addressLine2)].filter(Boolean);
  if (primary.length) {
    lines.push(primary.join(', '));
  }

  const locality = [safeTrim(info.city), safeTrim(info.province)].filter(Boolean);
  const localityLine = [...locality];
  if (safeTrim(info.postalCode)) {
    localityLine.push(safeTrim(info.postalCode));
  }
  if (localityLine.length) {
    lines.push(localityLine.join(', '));
  }

  if (safeTrim(info.country)) {
    lines.push(safeTrim(info.country));
  }

  return lines;
};

const buildRegistrationLines = (info: BusinessInfoState) => {
  const lines: string[] = [];
  if (safeTrim(info.registrationNumber)) {
    lines.push(`Registration No: ${safeTrim(info.registrationNumber)}`);
  }
  if (safeTrim(info.taxId)) {
    lines.push(`Tax ID: ${safeTrim(info.taxId)}`);
  }
  return lines;
};

const buildContactLines = (info: BusinessInfoState) => {
  const lines: string[] = [];
  if (safeTrim(info.phone)) {
    lines.push(`Phone: ${safeTrim(info.phone)}`);
  }
  if (safeTrim(info.supportContact)) {
    lines.push(`Support: ${safeTrim(info.supportContact)}`);
  }
  if (safeTrim(info.email)) {
    lines.push(`Email: ${safeTrim(info.email)}`);
  }
  if (safeTrim(info.website)) {
    lines.push(safeTrim(info.website));
  }
  return lines;
};

const createBrandingDetails = (
  businessInfo: BusinessInfoState,
  receiptSettings: ReceiptSettingsState
): ReceiptBrandingDetails => {
  const trimmedBusinessInfo: BusinessInfoState = {
    ...businessInfo,
    name: safeTrim(businessInfo.name) || DEFAULT_BUSINESS_INFO.name,
    legalName: safeTrim(businessInfo.legalName),
    registrationNumber: safeTrim(businessInfo.registrationNumber),
    taxId: safeTrim(businessInfo.taxId),
    addressLine1: safeTrim(businessInfo.addressLine1),
    addressLine2: safeTrim(businessInfo.addressLine2),
    city: safeTrim(businessInfo.city),
    province: safeTrim(businessInfo.province),
    postalCode: safeTrim(businessInfo.postalCode),
    country: safeTrim(businessInfo.country) || DEFAULT_BUSINESS_INFO.country,
    phone: safeTrim(businessInfo.phone),
    email: safeTrim(businessInfo.email),
    website: safeTrim(businessInfo.website),
    supportContact: safeTrim(businessInfo.supportContact),
    additionalNotes: safeTrim(businessInfo.additionalNotes),
  };

  const footerMessage = safeTrim(receiptSettings.footerMessage) || DEFAULT_RECEIPT_SETTINGS.footerMessage;

  return {
    displayName: trimmedBusinessInfo.name,
    legalName: trimmedBusinessInfo.legalName || undefined,
    registrationLines: buildRegistrationLines(trimmedBusinessInfo),
    addressLines: buildAddressLines(trimmedBusinessInfo),
    contactLines: buildContactLines(trimmedBusinessInfo),
    additionalNotes: trimmedBusinessInfo.additionalNotes || undefined,
    footerMessage,
  };
};

const useReceiptBranding = () => {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfoState>(DEFAULT_BUSINESS_INFO);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsState>(DEFAULT_RECEIPT_SETTINGS);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          return;
        }

        const result = await response.json();
        if (!result?.success || !result.data) {
          return;
        }

        const settingEntries: Array<{ key: string; value: any; data_type?: string }> = Array.isArray(result.data)
          ? result.data
          : Object.entries(result.data).map(([key, value]) => ({ key, value }));

        const settingMap = new Map<string, ParsedSetting>();

        settingEntries.forEach((entry) => {
          const dataType = entry.data_type || (typeof entry.value === 'boolean'
            ? 'boolean'
            : typeof entry.value === 'number'
            ? 'number'
            : 'string');

          settingMap.set(entry.key, {
            value: parseSettingValue(entry.value, dataType),
            dataType,
          });
        });

        if (!isMounted) {
          return;
        }

        const getStringSetting = (key: string, fallback: string) => {
          const entry = settingMap.get(key);
          if (!entry || entry.value === null || entry.value === undefined) {
            return fallback;
          }

          if (typeof entry.value === 'string') {
            return entry.value;
          }

          return String(entry.value);
        };

        setBusinessInfo((prev) => ({
          name: getStringSetting('business.name', prev.name),
          legalName: getStringSetting('business.legal_name', prev.legalName),
          registrationNumber: getStringSetting('business.registration_number', prev.registrationNumber),
          taxId: getStringSetting('business.tax_id', prev.taxId),
          addressLine1: getStringSetting('business.address_line1', prev.addressLine1),
          addressLine2: getStringSetting('business.address_line2', prev.addressLine2),
          city: getStringSetting('business.city', prev.city),
          province: getStringSetting('business.province', prev.province),
          postalCode: getStringSetting('business.postal_code', prev.postalCode),
          country: getStringSetting('business.country', prev.country),
          phone: getStringSetting('business.phone', prev.phone),
          email: getStringSetting('business.email', prev.email),
          website: getStringSetting('business.website', prev.website),
          supportContact: getStringSetting('business.support_contact', prev.supportContact),
          additionalNotes: getStringSetting('business.additional_notes', prev.additionalNotes),
        }));

        setReceiptSettings((prev) => ({
          footerMessage: getStringSetting('receipt.footer_message', prev.footerMessage),
        }));
      } catch (error) {
        console.error('Failed to load receipt branding settings:', error);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { businessInfo, receiptSettings };
};

/**
 * Order data structure with full details for receipt
 */
interface ReceiptOrderData {
  order: Order & {
    customer?: {
      full_name: string;
      customer_number: string;
    };
    cashier?: {
      full_name: string;
    };
    table?: {
      table_number: string;
    };
    order_items?: OrderItem[];
  };
}

interface PrintableReceiptProps {
  orderData: ReceiptOrderData;
  isPrintMode?: boolean;
  variant?: ReceiptLayoutVariant;
}

/**
 * PrintableReceipt Component
 * Pure receipt content without modal wrapper for reliable printing
 * This component is designed to be printed directly without CSS conflicts
 * 
 * @param orderData - Complete order data with customer, cashier, table, and items
 * @param isPrintMode - If true, applies print-optimized styling
 */
export function PrintableReceipt({ orderData, isPrintMode = false, variant = 'branded' }: PrintableReceiptProps) {
  if (variant === 'minimal') {
    return <MinimalPrintableReceipt orderData={orderData} isPrintMode={isPrintMode} />;
  }

  const { order } = orderData;
  const { businessInfo, receiptSettings } = useReceiptBranding();
  const branding = useMemo(
    () => createBrandingDetails(businessInfo, receiptSettings),
    [businessInfo, receiptSettings]
  );

  return (
    <div 
      className={`${isPrintMode ? 'print-receipt' : ''} bg-white`}
      style={isPrintMode ? { 
        maxWidth: '80mm', 
        margin: '0 auto', 
        padding: '8mm',
        paddingBottom: '14mm',
        fontFamily: 'monospace'
      } : { 
        padding: '2rem',
        fontFamily: 'monospace',
        maxWidth: '400px',
        margin: '0 auto'
      }}
    >
      {/* Logo and Business Name */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <Image
            src="/receipt-logo.png"
            alt="BeerHive Receipt Logo"
            width={120}
            height={120}
            className="object-contain grayscale contrast-200"
            priority
            unoptimized
          />
        </div>
        <div className="space-y-1">
          <h1
            className="text-3xl font-bold tracking-wider text-black"
            style={{ letterSpacing: '0.1em' }}
          >
            {branding.displayName.toUpperCase()}
          </h1>
          {branding.legalName && (
            <p className="text-sm text-black">{branding.legalName}</p>
          )}
          {branding.registrationLines.map((line, idx) => (
            <p key={`registration-${idx}`} className="text-xs text-black">
              {line}
            </p>
          ))}
          {branding.addressLines.map((line, idx) => (
            <p key={`address-${idx}`} className="text-xs text-black">
              {line}
            </p>
          ))}
          {branding.contactLines.map((line, idx) => (
            <p key={`contact-${idx}`} className="text-xs text-black">
              {line}
            </p>
          ))}
          {branding.additionalNotes && (
            <p className="text-xs text-black">{branding.additionalNotes}</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-5" />

      {/* Order Information */}
      <div className="mb-5">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-black font-semibold">Order #:</div>
          <div className="text-right font-bold">{order.order_number}</div>
          
          <div className="text-black">Date:</div>
          <div className="text-right">{formatReceiptDateTime(order.created_at)}</div>
          
          {order.cashier && (
            <>
              <div className="text-black">Cashier:</div>
              <div className="text-right">{order.cashier.full_name}</div>
            </>
          )}
          
          {order.table && (
            <>
              <div className="text-black">Table:</div>
              <div className="text-right font-semibold">Table {order.table.table_number}</div>
            </>
          )}
          
          {order.customer && (
            <>
              <div className="text-black">Customer:</div>
              <div className="text-right">{order.customer.full_name}</div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-5" />

      {/* Order Items */}
      <div className="mb-5">
        <h3 className="font-bold text-sm mb-4 text-center uppercase tracking-wide border-b-2 border-black pb-2">
          Order Items
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left pb-2 font-semibold">Item</th>
              <th className="text-center pb-2 font-semibold w-12">Qty</th>
              <th className="text-right pb-2 font-semibold w-20">Price</th>
              <th className="text-right pb-2 font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr className="border-b border-black">
                  <td className="py-3 pr-2">{item.item_name}</td>
                  <td className="text-center py-3">{item.quantity}x</td>
                  <td className="text-right py-3">{formatReceiptCurrency(item.unit_price)}</td>
                  <td className="text-right py-3 font-semibold">{formatReceiptCurrency(item.total)}</td>
                </tr>
                {item.notes && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pt-1 italic pl-2">
                      Note: {item.notes}
                    </td>
                  </tr>
                )}
                {item.is_vip_price && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pl-2 font-semibold uppercase">
                      VIP PRICE APPLIED
                    </td>
                  </tr>
                )}
                {item.is_complimentary && (
                  <tr>
                    <td colSpan={4} className="text-xs pb-2 pl-2 font-semibold uppercase">
                      COMPLIMENTARY ITEM
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-black my-5" />

      {/* Totals */}
      <div className="mb-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-black">Subtotal:</span>
            <span className="font-medium">{formatReceiptCurrency(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-medium">Discount:</span>
              <span className="font-semibold">-{formatReceiptCurrency(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-black">Tax:</span>
              <span className="font-medium">{formatReceiptCurrency(order.tax_amount)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-black mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold uppercase">Total:</span>
            <span className="text-2xl font-bold">{formatReceiptCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {order.payment_method && (
        <>
          <div className="border-t border-dashed border-black my-5" />
          <div className="mb-5">
            <h4 className="font-semibold text-sm mb-3 uppercase tracking-wide">Payment Details</h4>
            <div className="space-y-2 text-sm border border-black p-3 rounded">
              <div className="flex justify-between">
                <span className="text-black">Method:</span>
                <span className="font-semibold uppercase">{order.payment_method}</span>
              </div>
              {order.amount_tendered && (
                <div className="flex justify-between">
                  <span className="text-black">Tendered:</span>
                  <span className="font-medium">{formatReceiptCurrency(order.amount_tendered)}</span>
                </div>
              )}
              {order.change_amount !== null && order.change_amount > 0 && (
                <div className="flex justify-between border-t border-black pt-2 mt-2">
                  <span className="font-semibold text-black">Change:</span>
                  <span className="font-bold">{formatReceiptCurrency(order.change_amount)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t-2 border-double border-black my-6" />

      {/* Footer Message */}
      <div className="text-center space-y-3 py-4">
        <div className="mb-3">
          <p className="text-base font-bold text-black">{branding.footerMessage}</p>
        </div>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center mt-4 mb-20 pt-3 border-t border-gray-200">
          <p className="text-xs">
            Printed: {formatReceiptDateTime(new Date().toISOString())}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * MinimalPrintableReceipt Component
 * Provides a compact, professional receipt layout with reduced visual styling.
 *
 * @param orderData - Complete order data with details for printing
 * @param isPrintMode - Toggles print-specific sizing/styling
 */
interface MinimalPrintableReceiptProps {
  orderData: ReceiptOrderData;
  isPrintMode?: boolean;
}

export function MinimalPrintableReceipt({ orderData, isPrintMode = false }: MinimalPrintableReceiptProps) {
  const { order } = orderData;

  return (
    <div
      className={`${isPrintMode ? 'receipt-minimal-print' : ''} bg-white`}
      style={isPrintMode
        ? {
            maxWidth: '80mm',
            margin: '0 auto',
            padding: '6mm',
            fontFamily: 'monospace',
            fontSize: '11px',
          }
        : {
            padding: '1.5rem',
            fontFamily: 'monospace',
            maxWidth: '360px',
            margin: '0 auto',
            fontSize: '0.75rem',
          }}
    >
      <header className="text-center space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-900">BeerHive</p>
        <h1 className="text-base font-semibold text-gray-900">Sales Receipt</h1>
        <p className="text-[10px] text-gray-600">VAT Reg. TIN: —</p>
      </header>

      <div className="border-t border-dashed border-gray-400 my-3" />

      <section className="space-y-1 text-[11px] text-gray-800">
        <div className="flex justify-between">
          <span className="font-medium">Receipt #</span>
          <span>{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatReceiptDateTime(order.created_at)}</span>
        </div>
        {order.table && (
          <div className="flex justify-between">
            <span>Table</span>
            <span>{order.table.table_number}</span>
          </div>
        )}
        {order.cashier && (
          <div className="flex justify-between">
            <span>Cashier</span>
            <span>{order.cashier.full_name}</span>
          </div>
        )}
        {order.customer && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{order.customer.full_name}</span>
          </div>
        )}
      </section>

      <div className="border-t border-gray-300 my-3" />

      <section>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-gray-600 border-b border-gray-200">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.order_items?.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr>
                  <td className="py-2 pr-2">{item.item_name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatReceiptCurrency(item.total)}</td>
                </tr>
                {item.notes && (
                  <tr>
                    <td colSpan={3} className="pb-2 text-[10px] italic text-gray-500">
                      Note: {item.notes}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>

      <div className="border-t border-gray-300 my-3" />

      <section className="space-y-1 text-[11px] text-gray-800">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatReceiptCurrency(order.subtotal)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatReceiptCurrency(order.discount_amount)}</span>
          </div>
        )}
        {order.tax_amount > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatReceiptCurrency(order.tax_amount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-dashed border-gray-400 mt-2 text-gray-900 font-semibold">
          <span>Total</span>
          <span>{formatReceiptCurrency(order.total_amount)}</span>
        </div>
      </section>

      {order.payment_method && (
        <section className="mt-3 text-[11px] text-gray-800 space-y-1">
          <div className="font-medium text-gray-700">Payment</div>
          <div className="flex justify-between">
            <span>Method</span>
            <span className="uppercase">{order.payment_method}</span>
          </div>
          {order.amount_tendered && (
            <div className="flex justify-between">
              <span>Tendered</span>
              <span>{formatReceiptCurrency(order.amount_tendered)}</span>
            </div>
          )}
          {order.change_amount !== null && order.change_amount > 0 && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{formatReceiptCurrency(order.change_amount)}</span>
            </div>
          )}
        </section>
      )}

      <div className="border-t border-dashed border-gray-300 my-3" />

      <footer className="text-center text-[10px] text-gray-600 space-y-1">
        <p>Thank you for your purchase!</p>
        <p>Keep this receipt for your records.</p>
        {isPrintMode && (
          <p className="pt-1 border-t border-gray-200 mt-2">
            Printed {formatReceiptDateTime(new Date().toISOString())}
          </p>
        )}
      </footer>
    </div>
  );
}
