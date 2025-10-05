'use client';

import { HappyHour } from '@/models/entities/HappyHour';
import { HappyHourUtils } from '@/core/services/pricing/HappyHourUtils';
import { Badge } from '../shared/ui/Badge';
import { Button } from '../shared/ui/Button';
import { Edit, Trash2, Clock, Calendar, Percent, DollarSign } from 'lucide-react';

interface HappyHourListProps {
  happyHours: HappyHour[];
  loading: boolean;
  onEdit: (happyHour: HappyHour) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function HappyHourList({
  happyHours,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}: HappyHourListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (happyHours.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Happy Hours Yet</h3>
        <p className="text-gray-600">Create your first happy hour promotion to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {happyHours.map((happyHour) => (
        <HappyHourCard
          key={happyHour.id}
          happyHour={happyHour}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface HappyHourCardProps {
  happyHour: HappyHour;
  onEdit: (happyHour: HappyHour) => void;
  onDelete: (id: string) => void;
}

function HappyHourCard({ happyHour, onEdit, onDelete }: HappyHourCardProps) {
  const isCurrentlyActive = HappyHourUtils.isActive(happyHour);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900">{happyHour.name}</h3>
            {isCurrentlyActive && (
              <Badge variant="success" className="animate-pulse">
                Active Now
              </Badge>
            )}
            {!happyHour.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>

          {happyHour.description && (
            <p className="text-gray-600 mb-4">{happyHour.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Time Window */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Time Window</div>
                <div className="text-gray-600">
                  {HappyHourUtils.formatTimeWindow(happyHour)}
                </div>
              </div>
            </div>

            {/* Days of Week */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Days</div>
                <div className="text-gray-600">
                  {HappyHourUtils.formatDaysOfWeek(happyHour.days_of_week)}
                </div>
              </div>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-2 text-sm">
              {happyHour.discount_type === 'percentage' ? (
                <Percent className="w-4 h-4 text-green-600" />
              ) : (
                <DollarSign className="w-4 h-4 text-green-600" />
              )}
              <div>
                <div className="font-medium text-gray-900">Discount</div>
                <div className="text-gray-600">
                  {happyHour.discount_type === 'percentage'
                    ? `${happyHour.discount_value}%`
                    : happyHour.discount_type === 'fixed_amount'
                    ? `₱${happyHour.discount_value}`
                    : 'Complimentary'}
                </div>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          {(happyHour.valid_from || happyHour.valid_until) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Valid Period:</span>{' '}
                {happyHour.valid_from || 'No start date'} to{' '}
                {happyHour.valid_until || 'No end date'}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-4 flex flex-wrap gap-2">
            {happyHour.applies_to_all_products && (
              <Badge variant="info">All Products</Badge>
            )}
            {happyHour.min_order_amount && (
              <Badge variant="warning">
                Min Order: ₱{happyHour.min_order_amount}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(happyHour)}
            className="flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(happyHour.id)}
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
