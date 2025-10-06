'use client';

import { useState, useEffect } from 'react';
import { Package } from '@/models/entities/Package';
import { Product } from '@/models/entities/Product';
import PackageList from './PackageList';
import PackageForm from './PackageForm';
import { Button } from '../shared/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Badge } from '../shared/ui/badge';

/**
 * PackageManager Component
 * Main container for package management functionality
 */
export default function PackageManager() {
  const [packages, setPackages] = useState<(Package & { items?: any[] })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package & { items?: any[] } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'vip_only' | 'regular' | 'promotional'>('all');

  useEffect(() => {
    loadPackages();
    loadProducts();
  }, []);

  /**
   * Load all packages from API
   */
  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/packages?includeInactive=true');
      const result = await response.json();

      if (result.success) {
        setPackages(result.data);
      }
    } catch (error) {
      console.error('Load packages error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all products for package item selection
   */
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const result = await response.json();

      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  /**
   * Handle create new package
   */
  const handleCreate = () => {
    setEditingPackage(null);
    setShowForm(true);
  };

  /**
   * Handle edit existing package
   */
  const handleEdit = async (pkg: Package) => {
    try {
      // Fetch full package details including items
      const response = await fetch(`/api/packages/${pkg.id}`);
      const result = await response.json();

      if (result.success) {
        setEditingPackage(result.data);
        setShowForm(true);
      }
    } catch (error) {
      console.error('Load package details error:', error);
      alert('Failed to load package details');
    }
  };

  /**
   * Handle view package details
   */
  const handleView = async (packageId: string) => {
    // Navigate to package detail page or show modal
    window.location.href = `/packages/${packageId}`;
  };

  /**
   * Handle form close
   */
  const handleFormClose = () => {
    setShowForm(false);
    setEditingPackage(null);
  };

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: any) => {
    try {
      const url = editingPackage 
        ? `/api/packages/${editingPackage.id}` 
        : '/api/packages';
      
      const method = editingPackage ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setShowForm(false);
        setEditingPackage(null);
        loadPackages();
        alert(result.message || 'Package saved successfully!');
      } else {
        alert(result.error || 'Failed to save package');
      }
    } catch (error) {
      console.error('Save package error:', error);
      alert('Failed to save package');
    }
  };

  /**
   * Handle delete package
   */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadPackages();
      } else {
        alert(result.error || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Delete package error:', error);
      alert('Failed to delete package');
    }
  };

  // Filter packages by type
  const filteredPackages = filterType === 'all' 
    ? packages 
    : packages.filter(pkg => pkg.package_type === filterType);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
          <p className="text-gray-600 mt-1">Create and manage VIP packages and bundles</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Package
        </Button>
      </div>

      {/* Form Modal/Section */}
      {showForm && (
        <div className="mb-6">
          <PackageForm
            package={editingPackage || undefined}
            products={products}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by type:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({packages.length})
            </button>
            <button
              onClick={() => setFilterType('regular')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'regular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Regular ({packages.filter(p => p.package_type === 'regular').length})
            </button>
            <button
              onClick={() => setFilterType('vip_only')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'vip_only'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              VIP Only ({packages.filter(p => p.package_type === 'vip_only').length})
            </button>
            <button
              onClick={() => setFilterType('promotional')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'promotional'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Promotional ({packages.filter(p => p.package_type === 'promotional').length})
            </button>
          </div>
        </div>
      </div>

      {/* Package List */}
      <PackageList
        packages={filteredPackages}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />
    </div>
  );
}
