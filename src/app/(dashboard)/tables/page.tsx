'use client';

/**
 * Tables Management Page
 * Visual table management interface with real-time status updates and tab management
 * Protected route - accessible by admins, managers, cashiers, and waiters
 * 
 * Features:
 * - View and manage all restaurant tables
 * - Select a table to open or resume tabs
 * - Integrated session management for tab-based ordering
 * 
 * Note: Waiters can occupy/release tables and mark them as cleaned. Reservations,
 *       deactivation/reactivation, and creating tables remain manager/admin only.
 */

import { useState } from 'react';
import TableGrid from '@/views/tables/TableGrid';
import SessionSelector from '@/views/pos/SessionSelector';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

export default function TablesPage() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER]}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-600 mt-2">
            Select a table to open a tab or manage table status
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table Grid - Takes 2/3 of the width on large screens */}
          <div className="lg:col-span-2">
            <TableGrid 
              onTableSelect={setSelectedTableId} 
              selectedTableId={selectedTableId}
            />
          </div>
          
          {/* Session Selector - Takes 1/3 of the width on large screens */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <SessionSelector 
                tableId={selectedTableId || undefined} 
                onSessionSelected={(sessionId) => {
                  console.log('Session selected:', sessionId);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
