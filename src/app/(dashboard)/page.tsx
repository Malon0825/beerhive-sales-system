import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/views/shared/ui/card';
import Link from 'next/link';

/**
 * Dashboard Home Page
 * Shows system status and quick links
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">BeerHive POS Dashboard</h1>
        <p className="text-muted-foreground">
          Point of Sale System - Phase 2 Complete
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Check system health</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/api/health"
              target="_blank"
              className="text-primary hover:underline"
            >
              View Health Status →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Test</CardTitle>
            <CardDescription>Test database connection</CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/api/test-db"
              target="_blank"
              className="text-primary hover:underline"
            >
              Test Connection →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Implementation Guide</CardTitle>
            <CardDescription>View progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Phase 1: ✅ Complete<br />
              Phase 2: ✅ Complete<br />
              Phase 3: ⏳ Next
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Complete Phase 2 deployment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-semibold">To complete Phase 2:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Run database migration in Supabase SQL Editor</li>
            <li>Verify database with verification script</li>
            <li>Generate TypeScript types</li>
            <li>Test database connection above</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-4">
            See <code className="bg-muted px-1 py-0.5 rounded">QUICKSTART_PHASE2.md</code> for detailed instructions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
