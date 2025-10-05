import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Verifies the application is running
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'BeerHive POS API is running',
    version: '1.0.0',
    phase: 'Phase 2 - Database Setup'
  });
}
