/**
 * Tables Management Page
 * Visual table management interface with real-time status updates
 */

import { Metadata } from 'next';
import TableGrid from '@/views/tables/TableGrid';

export const metadata: Metadata = {
  title: 'Tables | BeerHive POS',
  description: 'Manage restaurant tables and table assignments',
};

export default function TablesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Table Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage table status in real-time
        </p>
      </div>
      
      <TableGrid />
    </div>
  );
}
