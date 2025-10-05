/**
 * Receipt API Route
 * GET /api/orders/[orderId]/receipt - Generate receipt for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReceiptGenerator } from '@/core/utils/generators/receiptGenerator';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReceiptTemplate } from '@/views/receipts/ReceiptTemplate';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html'; // html, pdf, text

    // Generate receipt data
    const receiptData = await ReceiptGenerator.generateReceipt(orderId);

    switch (format) {
      case 'pdf': {
        // Generate PDF
        const pdfDoc = ReceiptTemplate({ data: receiptData });
        const pdfBuffer = await renderToBuffer(pdfDoc);

        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="receipt-${receiptData.orderNumber}.pdf"`,
          },
        });
      }

      case 'text': {
        // Generate plain text receipt
        const textReceipt = ReceiptGenerator.formatReceiptData(receiptData);

        return new NextResponse(textReceipt, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `inline; filename="receipt-${receiptData.orderNumber}.txt"`,
          },
        });
      }

      case 'html':
      default: {
        // Generate HTML receipt
        const htmlReceipt = ReceiptGenerator.generateHTMLReceipt(receiptData);

        return new NextResponse(htmlReceipt, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        });
      }
    }
  } catch (error: any) {
    console.error('Receipt generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate receipt',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
