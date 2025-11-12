'use client';

import { useState, useEffect } from 'react';
import { Package } from '@/models/entities/Package';
import { Product } from '@/models/entities/Product';
import PackageList from './PackageList';
import PackageFormDialog from './PackageFormDialog';
import { Button } from '../shared/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Badge } from '../shared/ui/badge';
import { toast } from '@/lib/hooks/useToast';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';

/**
 * PackageManager Component
 * 
 * Main container for package management functionality with professional dialog-based UI
 * 
 * @remarks
 * Architecture:
 * - Follows Single Responsibility: UI orchestration only
 * - Delegates form presentation to PackageFormDialog
 * - Uses controlled dialog state for professional UX
 * - Implements optimistic UI updates where appropriate
 * 
 * Frontend Integration:
 * - Dialog handles all modal interactions and animations
 * - Toast notifications provide feedback without blocking UI
 * - Loading states prevent duplicate submissions
 */
export default function PackageManager() {
  const [packages, setPackages] = useState<(Package & { items?: any[] })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package & { items?: any[] } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'vip_only' | 'regular' | 'promotional'>('all');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [pendingDeactivatePackage, setPendingDeactivatePackage] = useState<(Package & { items?: any[] }) | null>(null);

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
   * Opens dialog in create mode
   */
  const handleCreate = () => {
    setEditingPackage(null);
    setDialogOpen(true);
  };

  /**
   * Handle edit existing package
   * Fetches full package details and opens dialog in edit mode
   * 
   * @param pkg - Package to edit (may not have full item details)
   */
  const handleEdit = async (pkg: Package) => {
    try {
      // Fetch full package details including items
      const response = await fetch(`/api/packages/${pkg.id}`);
      const result = await response.json();

      if (result.success) {
        setEditingPackage(result.data);
        setDialogOpen(true);
      } else {
        toast({
          title: '❌ Failed to Load Package',
          description: result.error || 'Could not load package details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Load package details error:', error);
      toast({
        title: '❌ Error',
        description: 'An unexpected error occurred while loading package details',
        variant: 'destructive',
      });
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
   * Handle dialog close
   * Resets editing state when dialog closes
   */
  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingPackage(null);
    }
  };

  /**
   * Handle form submission
   * 
   * Saves package data and provides user feedback
   * Closes dialog on success, shows error toast on failure
   * 
   * @param data - Validated form data from PackageForm
   */
  const handleFormSubmit = async (data: any) => {
    try {
      setSaving(true);
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
        // Success: Close dialog and show success notification
        setDialogOpen(false);
        setEditingPackage(null);
        
        toast({
          title: editingPackage ? '✅ Package Updated' : '✅ Package Created',
          description: result.message || 'Package saved successfully',
          variant: 'default',
        });
        
        // Reload packages to show changes
        loadPackages();
      } else {
        // Error: Keep dialog open and show error
        toast({
          title: '❌ Save Failed',
          description: result.error || 'Failed to save package',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save package error:', error);
      toast({
        title: '❌ Error',
        description: 'An unexpected error occurred while saving the package',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle deactivate package (opens confirmation dialog)
   */
  const handleDeactivateRequest = (pkg: Package & { items?: any[] }) => {
    setPendingDeactivatePackage(pkg);
    setShowDeactivateDialog(true);
  };

  /**
   * Execute package deactivation
   */
  const confirmDeactivate = async () => {
    if (!pendingDeactivatePackage) return;

    const pkg = pendingDeactivatePackage;
    setStatusUpdatingId(pkg.id);

    try {
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '📦 Package Deactivated',
          description: `${pkg.name} is now hidden from POS and ordering flows.`,
          variant: 'default',
        });
        await loadPackages();
      } else {
        toast({
          title: '❌ Deactivation Failed',
          description: result.error || 'Could not deactivate package. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Deactivate package error:', error);
      toast({
        title: '❌ Error',
        description: 'An unexpected error occurred while deactivating the package.',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdatingId(null);
      setShowDeactivateDialog(false);
      setPendingDeactivatePackage(null);
    }
  };

  /**
   * Handle package activation
   */
  const handleActivate = async (pkg: Package & { items?: any[] }) => {
    setStatusUpdatingId(pkg.id);

    try {
      const response = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '✅ Package Activated',
          description: `${pkg.name} is now available in POS.`,
          variant: 'default',
        });
        await loadPackages();
      } else {
        toast({
          title: '❌ Activation Failed',
          description: result.error || 'Could not activate package. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Activate package error:', error);
      toast({
        title: '❌ Error',
        description: 'An unexpected error occurred while activating the package.',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const statusFilteredPackages = statusFilter === 'all'
    ? packages
    : packages.filter(pkg => (statusFilter === 'active' ? pkg.is_active : pkg.is_active === false));

  const filteredPackages = filterType === 'all'
    ? statusFilteredPackages
    : statusFilteredPackages.filter(pkg => pkg.package_type === filterType);

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

      {/* Package Form Dialog */}
      <PackageFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        package={editingPackage || undefined}
        products={products}
        onSubmit={handleFormSubmit}
        loading={saving}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Show packages:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({packages.filter(p => p.is_active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive ({packages.filter(p => p.is_active === false).length})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({packages.length})
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
              All ({statusFilteredPackages.length})
            </button>
            <button
              onClick={() => setFilterType('regular')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'regular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Regular ({statusFilteredPackages.filter(p => p.package_type === 'regular').length})
            </button>
            <button
              onClick={() => setFilterType('vip_only')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'vip_only'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              VIP Only ({statusFilteredPackages.filter(p => p.package_type === 'vip_only').length})
            </button>
            <button
              onClick={() => setFilterType('promotional')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterType === 'promotional'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Promotional ({statusFilteredPackages.filter(p => p.package_type === 'promotional').length})
            </button>
          </div>
        </div>
      </div>

      {/* Package List */}
      <PackageList
        packages={filteredPackages}
        loading={loading}
        onEdit={handleEdit}
        onDeactivate={handleDeactivateRequest}
        onActivate={handleActivate}
        onView={handleView}
        statusUpdatingId={statusUpdatingId}
      />

      <ConfirmDialog
        open={showDeactivateDialog}
        onOpenChange={(open) => {
          setShowDeactivateDialog(open);
          if (!open) {
            setPendingDeactivatePackage(null);
          }
        }}
        title="Deactivate Package"
        description={pendingDeactivatePackage
          ? `Are you sure you want to deactivate "${pendingDeactivatePackage.name}"? The package will disappear from POS but remain in the management list so you can re-activate it later.`
          : ''}
        confirmText="Deactivate"
        variant="warning"
        onConfirm={confirmDeactivate}
        loading={statusUpdatingId === pendingDeactivatePackage?.id}
      />
    </div>
  );
}
