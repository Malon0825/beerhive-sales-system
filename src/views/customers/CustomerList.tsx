'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/models/entities/Customer';
import { CustomerCard } from './CustomerCard';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Search, Plus, Filter } from 'lucide-react';
import Link from 'next/link';
import { CustomerTier } from '@/models/enums/CustomerTier';

/**
 * CustomerList Component
 * Displays a searchable and filterable list of customers
 * Features:
 * - Real-time search by name, phone, email, or customer number
 * - Filter by VIP tier
 * - Customer statistics
 * - Add new customer button
 */
export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all customers from the API
   */
  useEffect(() => {
    fetchCustomers();
  }, []);

  /**
   * Filter customers based on search query and tier
   */
  useEffect(() => {
    filterCustomers();
  }, [searchQuery, selectedTier, customers]);

  /**
   * Fetch customers from API
   */
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/customers');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch customers');
      }

      setCustomers(result.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter customers based on search and tier selection
   */
  const filterCustomers = () => {
    let filtered = [...customers];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.full_name.toLowerCase().includes(query) ||
        customer.customer_number.toLowerCase().includes(query) ||
        (customer.phone && customer.phone.toLowerCase().includes(query)) ||
        (customer.email && customer.email.toLowerCase().includes(query))
      );
    }

    // Filter by tier
    if (selectedTier !== 'all') {
      filtered = filtered.filter(customer => customer.tier === selectedTier);
    }

    setFilteredCustomers(filtered);
  };

  /**
   * Calculate customer statistics
   */
  const stats = {
    total: customers.length,
    vip: customers.filter(c => c.tier !== CustomerTier.REGULAR).length,
    regular: customers.filter(c => c.tier === CustomerTier.REGULAR).length,
    silver: customers.filter(c => c.tier === CustomerTier.VIP_SILVER).length,
    gold: customers.filter(c => c.tier === CustomerTier.VIP_GOLD).length,
    platinum: customers.filter(c => c.tier === CustomerTier.VIP_PLATINUM).length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Error loading customers</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
          <Button onClick={fetchCustomers} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customers and VIP memberships</p>
        </div>
        <Link href="/customers/new">
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Total Customers</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Regular</div>
          <div className="text-2xl font-bold text-gray-700 mt-1">{stats.regular}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">Total VIP</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.vip}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 bg-gray-50">
          <div className="text-sm text-gray-600">Silver</div>
          <div className="text-2xl font-bold text-gray-500 mt-1">{stats.silver}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 bg-yellow-50">
          <div className="text-sm text-gray-600">Gold</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.gold}</div>
        </div>
        <div className="bg-white rounded-lg border p-4 bg-purple-50">
          <div className="text-sm text-gray-600">Platinum</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.platinum}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, phone, email, or customer number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tier Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Tiers</option>
              <option value={CustomerTier.REGULAR}>Regular</option>
              <option value={CustomerTier.VIP_SILVER}>Silver VIP</option>
              <option value={CustomerTier.VIP_GOLD}>Gold VIP</option>
              <option value={CustomerTier.VIP_PLATINUM}>Platinum VIP</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">
              {searchQuery || selectedTier !== 'all' 
                ? 'No customers found matching your criteria' 
                : 'No customers yet. Add your first customer!'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))
        )}
      </div>
    </div>
  );
}
