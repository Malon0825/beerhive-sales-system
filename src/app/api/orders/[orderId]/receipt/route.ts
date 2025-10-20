/**
 * Receipt API Route
 * GET /api/orders/[orderId]/receipt - Generate receipt for an order
 * 
 * Supports HTML and text formats only.
 * For PDF receipts, use browser's print-to-PDF functionality on the HTML receipt.
 * 
 * DEPLOYMENT FIX: Removed PDF format to eliminate @react-pdf/renderer dependency
 * which was causing Netlify function upload timeouts (50MB+ bundle size).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReceiptGenerator } from '@/core/utils/generators/receiptGenerator';

// Disable static optimization for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html'; // html or text

    // Generate receipt data
    const receiptData = await ReceiptGenerator.generateReceipt(orderId);

    switch (format) {
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
