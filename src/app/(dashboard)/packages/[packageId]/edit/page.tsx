'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package } from '@/models/entities/Package';
import { Product } from '@/models/entities/Product';
import PackageForm from '@/views/packages/PackageForm';
import { Button } from '@/views/shared/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Package Edit Page
 * Edit existing package details and items
 */
/**
 * Package Edit Page (Client Component)
 * Uses `useParams()` to access dynamic route params in Next 15.
 */
export default function PackageEditPage() {
  const { packageId } = useParams() as { packageId: string };
  const router = useRouter();
  const [packageData, setPackageData] = useState<(Package & { items?: any[] }) | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageData();
    loadProducts();
  }, [packageId]);

  /**
   * Load package data with items
   */
  const loadPackageData = async () => {
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

  /**
   * Load all products for item selection
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
   * Handle form submission
   */
  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert('Package updated successfully!');
        router.push(`/packages/${packageId}`);
      } else {
        alert(result.error || 'Failed to update package');
      }
    } catch (error) {
      console.error('Update package error:', error);
      alert('Failed to update package');
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.push(`/packages/${packageId}`);
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push(`/packages/${packageId}`)}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Package Details
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">Edit Package</h1>
        <p className="text-gray-600 mt-1">Update package details and items</p>
      </div>

      {/* Package Form */}
      <PackageForm
        package={packageData}
        products={products}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
