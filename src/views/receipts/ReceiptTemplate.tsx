/**
 * Receipt Template Component (PDF)
 * PDF receipt template using @react-pdf/renderer
 * 
 * ⚠️ DEPRECATED - October 2025
 * This component is NO LONGER USED and can be safely deleted.
 * 
 * REASON FOR DEPRECATION:
 * Removed to fix Netlify deployment timeout caused by @react-pdf/renderer
 * bloating serverless function bundle to 50MB+.
 * 
 * REPLACEMENT:
 * Use browser's native print-to-PDF functionality on HTML receipts instead.
 * See: /api/orders/[orderId]/receipt?format=html
 * 
 * If you need to restore PDF functionality, consider:
 * 1. Netlify Edge Functions (see .windsurf/workflows/netlify-pdf-edge-function.md)
 * 2. Third-party PDF services (PDFShift, DocRaptor)
 * 3. Client-side PDF generation libraries (jsPDF, pdfmake)
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ReceiptData } from '@/core/utils/generators/receiptGenerator';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
  },
  businessName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  businessInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  divider: {
    borderBottom: '1px solid #000',
    marginVertical: 8,
  },
  thickDivider: {
    borderBottom: '2px solid #000',
    marginVertical: 8,
  },
  dashedDivider: {
    borderBottom: '1px dashed #000',
    marginVertical: 8,
  },
  orderInfo: {
    marginBottom: 10,
  },
  infoRow: {
    marginBottom: 3,
  },
  itemsHeader: {
    flexDirection: 'row',
    fontWeight: 'bold',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottom: '1px solid #000',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  itemQty: {
    width: '15%',
  },
  itemName: {
    width: '55%',
  },
  itemAmount: {
    width: '30%',
    textAlign: 'right',
  },
  itemNote: {
    fontSize: 8,
    marginLeft: 40,
    fontStyle: 'italic',
    marginTop: 2,
  },
  complimentary: {
    fontSize: 8,
    marginLeft: 40,
    fontWeight: 'bold',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 5,
  },
  paymentSection: {
    marginTop: 10,
  },
  footer: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 9,
  },
  footerMessage: {
    marginBottom: 5,
  },
  poweredBy: {
    fontSize: 8,
    color: '#666',
  },
});

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export const ReceiptTemplate = ({ data }: ReceiptTemplateProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Document>
      <Page size={{ width: 226.77, height: 'auto' }} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.businessName}>{data.businessName.toUpperCase()}</Text>
          {data.businessAddress && (
            <Text style={styles.businessInfo}>{data.businessAddress}</Text>
          )}
          {data.businessPhone && (
            <Text style={styles.businessInfo}>{data.businessPhone}</Text>
          )}
          {data.businessEmail && (
            <Text style={styles.businessInfo}>{data.businessEmail}</Text>
          )}
        </View>

        <View style={styles.thickDivider} />

        {/* Order Information */}
        <View style={styles.orderInfo}>
          <Text style={styles.infoRow}>Order #: {data.orderNumber}</Text>
          <Text style={styles.infoRow}>
            Date: {format(data.orderDate, 'MMM dd, yyyy HH:mm')}
          </Text>
          {data.tableNumber && (
            <Text style={styles.infoRow}>Table: {data.tableNumber}</Text>
          )}
          {data.customerName && (
            <Text style={styles.infoRow}>
              Customer: {data.customerName}
              {data.customerTier && data.customerTier !== 'regular' 
                ? ` (${data.customerTier.toUpperCase()})` 
                : ''}
            </Text>
          )}
          <Text style={styles.infoRow}>Cashier: {data.cashierName}</Text>
        </View>

        <View style={styles.dashedDivider} />

        {/* Items Header */}
        <View style={styles.itemsHeader}>
          <Text style={styles.itemQty}>QTY</Text>
          <Text style={styles.itemName}>ITEM</Text>
          <Text style={styles.itemAmount}>AMOUNT</Text>
        </View>

        {/* Items */}
        {data.items.map((item, index) => (
          <View key={index}>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemAmount}>{formatCurrency(item.total)}</Text>
            </View>
            {item.notes && (
              <Text style={styles.itemNote}>Note: {item.notes}</Text>
            )}
            {item.isComplimentary && (
              <Text style={styles.complimentary}>** COMPLIMENTARY **</Text>
            )}
          </View>
        ))}

        <View style={styles.dashedDivider} />

        {/* Totals */}
        <View style={styles.totalRow}>
          <Text>Subtotal:</Text>
          <Text>{formatCurrency(data.subtotal)}</Text>
        </View>

        {data.discountAmount > 0 && (
          <View style={styles.totalRow}>
            <Text>Discount:</Text>
            <Text>-{formatCurrency(data.discountAmount)}</Text>
          </View>
        )}

        {data.taxAmount > 0 && (
          <View style={styles.totalRow}>
            <Text>Tax:</Text>
            <Text>{formatCurrency(data.taxAmount)}</Text>
          </View>
        )}

        <View style={styles.thickDivider} />

        <View style={styles.grandTotal}>
          <Text>TOTAL:</Text>
          <Text>{formatCurrency(data.totalAmount)}</Text>
        </View>

        <View style={styles.thickDivider} />

        {/* Payment */}
        <View style={styles.paymentSection}>
          <Text style={styles.infoRow}>
            Payment Method: {data.paymentMethod.toUpperCase()}
          </Text>
          {data.amountTendered && (
            <Text style={styles.infoRow}>
              Tendered: {formatCurrency(data.amountTendered)}
            </Text>
          )}
          {data.changeAmount && (
            <Text style={styles.infoRow}>
              Change: {formatCurrency(data.changeAmount)}
            </Text>
          )}
        </View>

        <View style={styles.dashedDivider} />

        {/* Footer */}
        <View style={styles.footer}>
          {data.footerMessage && (
            <Text style={styles.footerMessage}>{data.footerMessage}</Text>
          )}
          <Text style={styles.poweredBy}>Powered by BeerHive POS</Text>
        </View>
      </Page>
    </Document>
  );
};
