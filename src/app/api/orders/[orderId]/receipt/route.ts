/**
 * Receipt API Route
 * GET /api/orders/[orderId]/receipt - Generate receipt for an order
 * 
 * This route dynamically imports @react-pdf/renderer to prevent build-time conflicts
 * with Next.js static page generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReceiptGenerator } from '@/core/utils/generators/receiptGenerator';

// Disable static optimization for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Use Netlify On-Demand Builders for this heavy route
// This separates it from the main server handler and provides:
// - Longer timeout (up to 26 seconds vs 10 seconds)
// - Separate bundle (doesn't bloat main handler)
// - CDN caching for repeated requests
export const config = {
  type: 'experimental-background',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'html'; // html, pdf, text

    // Generate receipt data
    const receiptData = await ReceiptGenerator.generateReceipt(orderId);

    switch (format) {
      case 'pdf': {
        // Dynamically import PDF rendering libraries to avoid build-time issues
        const { renderToBuffer } = await import('@react-pdf/renderer');
        const { ReceiptTemplate } = await import('@/views/receipts/ReceiptTemplate');
        
        // Generate PDF
        const pdfDoc = ReceiptTemplate({ data: receiptData });
        const pdfBuffer = await renderToBuffer(pdfDoc);

        return new NextResponse(pdfBuffer as any, {
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
