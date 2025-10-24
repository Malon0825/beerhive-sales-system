'use client';

import { Package, PackageItem } from '@/models/entities/Package';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Edit, Trash2, Package as PackageIcon, Users, Calendar, DollarSign } from 'lucide-react';

interface PackageListProps {
  packages: (Package & { items?: any[] })[];
  loading: boolean;
  onEdit: (pkg: Package) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

/**
 * PackageList Component
 * Displays a list of packages with actions
 */
export default function PackageList({
  packages,
  loading,
  onEdit,
  onDelete,
  onView,
}: PackageListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <PackageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Packages Yet</h3>
        <p className="text-gray-600">Create your first package to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          package={pkg}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}

interface PackageCardProps {
  package: Package & { items?: any[] };
  onEdit: (pkg: Package) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

/**
 * PackageCard Component
 * Displays individual package information
 */
function PackageCard({ package: pkg, onEdit, onDelete, onView }: PackageCardProps) {
  const isValid = () => {
    const today = new Date().toISOString().split('T')[0];
    const validFrom = pkg.valid_from || '1900-01-01';
    const validUntil = pkg.valid_until || '2100-12-31';
    return today >= validFrom && today <= validUntil;
  };

  const getTypeColor = () => {
    switch (pkg.package_type) {
      case 'vip_only':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'promotional':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeLabel = () => {
    switch (pkg.package_type) {
      case 'vip_only':
        return 'VIP Only';
      case 'promotional':
        return 'Promotional';
      default:
        return 'Regular';
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
      onClick={() => onView(pkg.id)}
    >
      {/* Header with Type Badge */}
      <div className={`px-6 py-3 border-b ${getTypeColor()}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{getTypeLabel()}</span>
          {!pkg.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {pkg.is_active && !isValid() && (
            <Badge variant="warning">Expired</Badge>
          )}
        </div>
      </div>

      {/* Package Details */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{pkg.name}</h3>
        <p className="text-sm text-gray-500 mb-1">Code: {pkg.package_code}</p>
        
        {pkg.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>
        )}

        {/* Pricing */}
        <div className="mb-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Base Price:</span>
            <span className="text-lg font-bold text-gray-900">₱{pkg.base_price.toFixed(2)}</span>
          </div>
          {pkg.vip_price && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">VIP Price:</span>
              <span className="text-md font-semibold text-purple-600">₱{pkg.vip_price.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Package Info */}
        <div className="space-y-2 mb-4">
          {pkg.items && pkg.items.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <PackageIcon className="w-4 h-4" />
              <span>{pkg.items.length} items included</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>Quantity based on stock availability</span>
          </div>
        </div>

        {/* Validity Period */}
        {(pkg.valid_from || pkg.valid_until) && (
          <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
            <Calendar className="w-3 h-3 inline mr-1" />
            Valid: {pkg.valid_from || 'No start'} to {pkg.valid_until || 'No end'}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(pkg);
            }}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Are you sure you want to delete "${pkg.name}"?`)) {
                onDelete(pkg.id);
              }
            }}
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
