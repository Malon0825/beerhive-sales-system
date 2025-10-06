'use client';

import { CustomerEvent } from '@/models/entities/CustomerEvent';
import { RedemptionUtils } from '@/core/services/events/RedemptionUtils';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Edit, Trash2, Calendar, Gift, AlertCircle } from 'lucide-react';
import { EventType } from '@/models/enums/EventType';

interface EventListProps {
  events: CustomerEvent[];
  loading: boolean;
  onEdit: (event: CustomerEvent) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function EventList({
  events,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}: EventListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Yet</h3>
        <p className="text-gray-600">Create customer events to offer special promotions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface EventCardProps {
  event: CustomerEvent;
  onEdit: (event: CustomerEvent) => void;
  onDelete: (id: string) => void;
}

function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const daysUntilExpiry = RedemptionUtils.getDaysUntilExpiry(event);
  const isExpiringSoon = RedemptionUtils.isExpiringSoon(event);
  const isExpired = event.offer_valid_until && new Date(event.offer_valid_until) < new Date();

  const getEventTypeIcon = () => {
    switch (event.event_type) {
      case EventType.BIRTHDAY:
        return '🎂';
      case EventType.ANNIVERSARY:
        return '💝';
      case EventType.CUSTOM:
        return '🎁';
      default:
        return '🎉';
    }
  };

  const getEventTypeBadge = () => {
    switch (event.event_type) {
      case EventType.BIRTHDAY:
        return <Badge variant="info">Birthday</Badge>;
      case EventType.ANNIVERSARY:
        return <Badge variant="secondary">Anniversary</Badge>;
      case EventType.CUSTOM:
        return <Badge variant="warning">Custom Event</Badge>;
      default:
        return <Badge>{event.event_type}</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{getEventTypeIcon()}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {getEventTypeBadge()}
                {event.is_redeemed && (
                  <Badge variant="success">Redeemed</Badge>
                )}
                {!event.is_redeemed && isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {!event.is_redeemed && isExpiringSoon && !isExpired && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Expiring Soon
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {event.event_name || `${event.event_type} Event`}
              </h3>
            </div>
          </div>

          {/* Customer Info */}
          {(event as any).customers && (
            <div className="mb-3 text-sm text-gray-600">
              <span className="font-medium">Customer:</span>{' '}
              {(event as any).customers.full_name} (
              {(event as any).customers.customer_number})
            </div>
          )}

          {/* Event Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Calendar className="w-4 h-4" />
            <span>Event Date: {new Date(event.event_date).toLocaleDateString()}</span>
          </div>

          {/* Offer Description */}
          {event.offer_description && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">Offer:</span>
              </div>
              <p className="text-gray-700 ml-6">{event.offer_description}</p>
            </div>
          )}

          {/* Offer Details */}
          <div className="flex flex-wrap gap-2 mb-3">
            {event.discount_type && event.discount_value && (
              <Badge variant="success">
                {event.discount_type === 'percentage'
                  ? `${event.discount_value}% Discount`
                  : event.discount_type === 'fixed_amount'
                  ? `₱${event.discount_value} Discount`
                  : 'Complimentary'}
              </Badge>
            )}
            {event.free_item_product_id && (
              <Badge variant="info">Free Item Included</Badge>
            )}
          </div>

          {/* Validity Period */}
          {(event.offer_valid_from || event.offer_valid_until) && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Valid:</span>{' '}
              {event.offer_valid_from
                ? new Date(event.offer_valid_from).toLocaleDateString()
                : 'No start date'}{' '}
              to{' '}
              {event.offer_valid_until
                ? new Date(event.offer_valid_until).toLocaleDateString()
                : 'No end date'}
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && !event.is_redeemed && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'} left)
                </span>
              )}
            </div>
          )}

          {/* Redeemed Info */}
          {event.is_redeemed && event.redeemed_at && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Redeemed:</span>{' '}
                {new Date(event.redeemed_at).toLocaleString()}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-sm">
                <span className="font-medium text-gray-900">Notes:</span>
                <p className="text-gray-600 mt-1">{event.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!event.is_redeemed && (
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(event)}
              className="flex items-center gap-1"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(event.id)}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
