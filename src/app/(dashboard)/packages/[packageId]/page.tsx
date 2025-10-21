'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, PackageItem } from '@/models/entities/Package';
import { Button } from '@/views/shared/ui/button';
import { Badge } from '@/views/shared/ui/badge';
import { ArrowLeft, Edit, Trash2, Package as PackageIcon, Calendar, DollarSign, Users } from 'lucide-react';

/**
 * Package Detail Page
 * Displays detailed information about a specific package
 */
/**
 * Package Detail Page (Client Component)
 * Uses `useParams()` to access dynamic route params in Next 15.
 */
export default function PackageDetailPage() {
  const { packageId } = useParams() as { packageId: string };
  const router = useRouter();
  const [packageData, setPackageData] = useState<(Package & { items?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackage();
  }, [packageId]);

  const loadPackage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/packages/${packageId}`);
      const result = await response.json();

      if (result.success) {
        setPackageData(result.data);
      } else {
        alert(result.error || 'Package not found');
        router.push('/packages');
      }
    } catch (error) {
      console.error('Load package error:', error);
      alert('Failed to load package');
      router.push('/packages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${packageData?.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('Package deleted successfully');
        router.push('/packages');
      } else {
        alert(result.error || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Delete package error:', error);
      alert('Failed to delete package');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="p-6">
        <p>Package not found</p>
      </div>
    );
  }

  const getTypeColor = () => {
    switch (packageData.package_type) {
      case 'vip_only':
        return 'bg-purple-100 text-purple-800';
      case 'promotional':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeLabel = () => {
    switch (packageData.package_type) {
      case 'vip_only':
        return 'VIP Only';
      case 'promotional':
        return 'Promotional';
      default:
        return 'Regular';
    }
  };

  const calculateTotalValue = () => {
    if (!packageData.items) return 0;
    return packageData.items.reduce((total: number, item: any) => {
      return total + (item.product?.base_price || 0) * item.quantity;
    }, 0);
  };

  const savings = calculateTotalValue() - packageData.base_price;
  const savingsPercent = calculateTotalValue() > 0 
    ? (savings / calculateTotalValue()) * 100 
    : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/packages')}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packages
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{packageData.name}</h1>
              <Badge className={getTypeColor()}>{getTypeLabel()}</Badge>
              {!packageData.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-gray-600">Code: {packageData.package_code}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/packages/${packageId}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {packageData.description && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700">{packageData.description}</p>
            </div>
          )}

          {/* Package Items */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Package Contents</h2>
            {packageData.items && packageData.items.length > 0 ? (
              <div className="space-y-3">
                {packageData.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <PackageIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</div>
                        <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ₱{((item.product?.base_price || 0) * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ₱{(item.product?.base_price || 0).toFixed(2)} each
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No items in this package</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Items Value:</span>
                <span className="font-semibold text-gray-900">₱{calculateTotalValue().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Package Price:</span>
                <span className="text-2xl font-bold text-blue-600">₱{packageData.base_price.toFixed(2)}</span>
              </div>
              {packageData.vip_price && (
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-gray-600">VIP Price:</span>
                  <span className="text-xl font-bold text-purple-600">₱{packageData.vip_price.toFixed(2)}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">You Save:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₱{savings.toFixed(2)} ({savingsPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-gray-500" />
                <span>Quantity controlled by component stock availability</span>
              </div>
              
              {packageData.is_addon_eligible && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="info">Add-ons Allowed</Badge>
                </div>
              )}

              {(packageData.valid_from || packageData.valid_until) && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Validity Period</span>
                  </div>
                  <div className="text-sm text-gray-700 ml-6">
                    {packageData.valid_from || 'No start date'} to {packageData.valid_until || 'No end date'}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                <div>Created: {new Date(packageData.created_at).toLocaleDateString()}</div>
                <div>Updated: {new Date(packageData.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
