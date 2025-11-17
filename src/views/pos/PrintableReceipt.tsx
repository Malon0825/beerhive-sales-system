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
  // Session-specific fields for tab receipts
  sessionMetadata?: {
    session_number: string;
    opened_at: string;
    duration_minutes: number;
    order_count: number;
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

  const { order, sessionMetadata } = orderData;
  const isSessionReceipt = !!sessionMetadata;
  
  const { businessInfo, receiptSettings } = useReceiptBranding();
  const branding = useMemo(
    () => createBrandingDetails(businessInfo, receiptSettings),
    [businessInfo, receiptSettings]
  );
  
  // Helper to format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  // Helper to format time only
  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <div 
      className={`${isPrintMode ? 'print-receipt' : ''} bg-white`}
      style={isPrintMode ? { 
        width: '80mm',
        maxWidth: '80mm', 
        margin: '0 auto', 
        padding: '4mm 6mm 14mm 6mm',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.2',
        textAlign: 'left',
        boxSizing: 'border-box'
      } : { 
        padding: '1.5rem',
        fontFamily: 'monospace',
        maxWidth: '400px',
        margin: '0 auto',
        fontSize: '0.875rem',
        lineHeight: '1.3'
      }}
    >
      {/* Logo and Business Name - Compact */}
      <div className="text-center" style={{ marginBottom: '8px' }}>
        <div className="flex justify-center" style={{ marginBottom: '6px' }}>
          {isPrintMode ? (
            <img
              src="/receipt-logo.png"
              alt="BeerHive Receipt Logo"
              width={80}
              height={80}
              style={{ objectFit: 'contain', filter: 'grayscale(100%) contrast(200%)' }}
            />
          ) : (
            <Image
              src="/receipt-logo.png"
              alt="BeerHive Receipt Logo"
              width={80}
              height={80}
              className="object-contain grayscale contrast-200"
              priority
              unoptimized
            />
          )}
        </div>
        <div style={{ lineHeight: '1.2' }}>
          <h1
            className="font-bold tracking-wider text-black"
            style={{ letterSpacing: '0.1em', fontSize: '16px', marginBottom: '2px' }}
          >
            {branding.displayName.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* Divider - Minimal */}
      <div className="border-t-2 border-double border-black" style={{ margin: '6px 0' }} />

      {/* Session Badge for Tab Receipts - Compact */}
      {isSessionReceipt && sessionMetadata && (
        <div className="text-center" style={{ marginBottom: '6px' }}>
          <div className="inline-block border border-black" style={{ padding: '3px 8px', borderRadius: '4px' }}>
            <p className="text-black font-semibold uppercase" style={{ fontSize: '8px', marginBottom: '1px', letterSpacing: '0.05em' }}>Tab Session</p>
            <p className="font-bold text-black" style={{ fontSize: '11px' }}>{sessionMetadata.session_number}</p>
          </div>
        </div>
      )}

      {/* Order Information - Compact */}
      <div style={{ marginBottom: '6px' }}>
        <div className="grid grid-cols-2" style={{ fontSize: '9px', lineHeight: '1.4', rowGap: '2px' }}>
          {isSessionReceipt && sessionMetadata ? (
            <>
              <div className="text-black font-semibold">Session:</div>
              <div className="text-right font-bold">{sessionMetadata.session_number}</div>
              
              <div className="text-black">Opened:</div>
              <div className="text-right">{formatReceiptDateTime(sessionMetadata.opened_at)}</div>
              
              <div className="text-black">Duration:</div>
              <div className="text-right font-semibold">{formatDuration(sessionMetadata.duration_minutes)}</div>
              
              <div className="text-black">Orders:</div>
              <div className="text-right font-semibold">{sessionMetadata.order_count} order{sessionMetadata.order_count !== 1 ? 's' : ''}</div>
            </>
          ) : (
            <>
              <div className="text-black font-semibold">Order:</div>
              <div className="text-right font-bold">{order.order_number}</div>
              
              <div className="text-black">Date:</div>
              <div className="text-right">{formatReceiptDateTime(order.created_at)}</div>
              
              {order.cashier && (
                <>
                  <div className="text-black">Cashier:</div>
                  <div className="text-right">{order.cashier.full_name}</div>
                </>
              )}
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

      {/* Divider - Minimal */}
      <div className="border-t border-dashed border-black" style={{ margin: '4px 0' }} />

      {/* Order Items - Compact Unified Layout */}
      <div style={{ marginBottom: '6px' }}>
        <h3 className="font-bold text-center uppercase border-b border-black" style={{ fontSize: '10px', paddingBottom: '2px', marginBottom: '4px', letterSpacing: '0.05em' }}>
          {isSessionReceipt ? 'Items' : 'Items'}
        </h3>
        
        {/* Unified Table - Works for both POS and Session */}
        <table className="w-full" style={{ fontSize: '9px' }}>
          <thead>
            <tr className="border-b border-black">
              <th className="text-left font-semibold" style={{ paddingBottom: '2px' }}>Item</th>
              <th className="text-center font-semibold" style={{ width: '28px', paddingBottom: '2px' }}>Qty</th>
              <th className="text-right font-semibold" style={{ width: '50px', paddingBottom: '2px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr className="border-b border-gray-300">
                  <td style={{ paddingTop: '3px', paddingBottom: '3px', paddingRight: '4px' }}>
                    {item.item_name}
                    {item.is_vip_price && <span className="text-xs"> [VIP]</span>}
                    {item.is_complimentary && <span className="text-xs"> [FREE]</span>}
                  </td>
                  <td className="text-center" style={{ paddingTop: '3px', paddingBottom: '3px' }}>
                    {item.quantity}x
                  </td>
                  <td className="text-right font-semibold" style={{ paddingTop: '3px', paddingBottom: '3px' }}>
                    {item.is_complimentary ? (
                      <span style={{ fontSize: '8px' }}>FREE</span>
                    ) : (
                      formatReceiptCurrency(item.total)
                    )}
                  </td>
                </tr>
                {/* Package items breakdown */}
                {item.package_id && item.complex_product_metadata?.package_items && (
                  <tr>
                    <td colSpan={3} style={{ fontSize: '8px', paddingBottom: '3px', paddingLeft: '8px', paddingTop: '1px', color: '#666' }}>
                      {item.complex_product_metadata.package_items.map((pi, idx) => (
                        <div key={idx} style={{ marginBottom: '1px' }}>
                          • {pi.quantity}x {pi.product_name}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
                {item.notes && (
                  <tr>
                    <td colSpan={3} className="italic" style={{ fontSize: '8px', paddingBottom: '2px', paddingLeft: '4px', paddingTop: '1px' }}>
                      Note: {item.notes}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divider - Minimal */}
      <div className="border-t border-dashed border-black" style={{ margin: '4px 0' }} />

      {/* Totals - Compact */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
          <div className="flex justify-between" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
            <span className="text-black">Subtotal:</span>
            <span className="font-medium">{formatReceiptCurrency(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
              <span className="font-medium">Discount:</span>
              <span className="font-semibold">-{formatReceiptCurrency(order.discount_amount)}</span>
            </div>
          )}
          {order.tax_amount > 0 && (
            <div className="flex justify-between" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
              <span className="text-black">Tax:</span>
              <span className="font-medium">{formatReceiptCurrency(order.tax_amount)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-black" style={{ marginTop: '4px', paddingTop: '4px' }}>
          <div className="flex justify-between items-center">
            <span className="font-bold uppercase" style={{ fontSize: '12px' }}>Total:</span>
            <span className="font-bold" style={{ fontSize: '14px' }}>{formatReceiptCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details - Compact */}
      {order.payment_method && (
        <>
          <div className="border-t border-dashed border-black" style={{ margin: '4px 0' }} />
          <div style={{ marginBottom: '6px' }}>
            <h4 className="font-semibold uppercase" style={{ fontSize: '9px', marginBottom: '3px', letterSpacing: '0.05em' }}>Payment</h4>
            <div className="border border-black" style={{ fontSize: '10px', padding: '4px', lineHeight: '1.4' }}>
              <div className="flex justify-between" style={{ marginBottom: '2px' }}>
                <span className="text-black">Method:</span>
                <span className="font-semibold uppercase">{order.payment_method}</span>
              </div>
              {order.amount_tendered && (
                <div className="flex justify-between" style={{ marginBottom: '2px' }}>
                  <span className="text-black">Tendered:</span>
                  <span className="font-medium">{formatReceiptCurrency(order.amount_tendered)}</span>
                </div>
              )}
              {order.change_amount !== null && order.change_amount > 0 && (
                <div className="flex justify-between border-t border-black" style={{ paddingTop: '3px', marginTop: '3px' }}>
                  <span className="font-semibold text-black">Change:</span>
                  <span className="font-bold">{formatReceiptCurrency(order.change_amount)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Divider - Minimal */}
      <div className="border-t-2 border-double border-black" style={{ margin: '6px 0' }} />

      {/* Footer Message - Compact */}
      <div className="text-center" style={{ paddingTop: '4px', paddingBottom: '4px' }}>
        <p className="font-bold text-black" style={{ fontSize: '10px' }}>{branding.footerMessage}</p>
      </div>

      {/* Print Timestamp - Only visible when printed */}
      {isPrintMode && (
        <div className="text-center border-t border-gray-200" style={{ marginTop: '4px', marginBottom: '40px', paddingTop: '3px' }}>
          <p style={{ fontSize: '8px' }}>
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
                {/* Package items breakdown */}
                {item.package_id && item.complex_product_metadata?.package_items && (
                  <tr>
                    <td colSpan={3} className="pb-2 text-[10px] text-gray-500 pl-4">
                      {item.complex_product_metadata.package_items.map((pi, idx) => (
                        <div key={idx}>
                          • {pi.quantity}x {pi.product_name}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
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
