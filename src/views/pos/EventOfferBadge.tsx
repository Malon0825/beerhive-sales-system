'use client';

import { useState, useEffect } from 'react';
import { CustomerEvent } from '@/models/entities/CustomerEvent';
import { RedemptionService } from '@/core/services/events/RedemptionService';
import { Badge } from '../shared/ui/badge';
import { Gift, Calendar, AlertCircle } from 'lucide-react';
import { EventType } from '@/models/enums/EventType';

interface EventOfferBadgeProps {
  customerId: string | null;
  onOfferSelect?: (event: CustomerEvent) => void;
}

export default function EventOfferBadge({ customerId, onOfferSelect }: EventOfferBadgeProps) {
  const [activeOffers, setActiveOffers] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (customerId) {
      loadActiveOffers();
    } else {
      setActiveOffers([]);
    }
  }, [customerId]);

  const loadActiveOffers = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/events?customer_id=${customerId}&is_redeemed=false`);
      const result = await response.json();

      if (result.success) {
        // Filter to only show valid offers
        const validOffers = (result.data || []).filter((event: CustomerEvent) => {
          const validation = RedemptionService.validateOffer(event);
          return validation.valid;
        });
        setActiveOffers(validOffers);
      }
    } catch (error) {
      console.error('Load active offers error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || activeOffers.length === 0) {
    return null;
  }

  const primaryOffer = activeOffers[0];
  const daysUntilExpiry = RedemptionService.getDaysUntilExpiry(primaryOffer);
  const isExpiringSoon = RedemptionService.isExpiringSoon(primaryOffer);

  const getEventIcon = (eventType: EventType) => {
    switch (eventType) {
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`w-full px-4 py-3 rounded-lg shadow-md transition-all duration-300 ${
          isExpiringSoon
            ? 'bg-gradient-to-r from-orange-400 to-red-500 animate-pulse'
            : 'bg-gradient-to-r from-purple-500 to-pink-600'
        } text-white hover:shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getEventIcon(primaryOffer.event_type)}</span>
            <div className="text-left">
              <div className="font-bold text-sm flex items-center gap-2">
                {primaryOffer.event_type === EventType.BIRTHDAY && 'BIRTHDAY OFFER!'}
                {primaryOffer.event_type === EventType.ANNIVERSARY && 'ANNIVERSARY OFFER!'}
                {primaryOffer.event_type === EventType.CUSTOM && 'SPECIAL OFFER!'}
                {activeOffers.length > 1 && (
                  <span className="text-xs bg-white text-purple-600 px-2 py-0.5 rounded-full">
                    +{activeOffers.length - 1}
                  </span>
                )}
              </div>
              <div className="text-xs opacity-90">
                {RedemptionService.formatOffer(primaryOffer)}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="success" className="bg-white text-purple-600 font-bold">
              {primaryOffer.discount_type === 'percentage'
                ? `${primaryOffer.discount_value}% OFF`
                : primaryOffer.discount_type === 'fixed_amount'
                ? `₱${primaryOffer.discount_value} OFF`
                : 'FREE'}
            </Badge>
            {isExpiringSoon && daysUntilExpiry !== null && (
              <div className="text-xs flex items-center gap-1 bg-white text-orange-600 px-2 py-0.5 rounded">
                <AlertCircle className="w-3 h-3" />
                {daysUntilExpiry}d left
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 max-h-96 overflow-y-auto">
          {activeOffers.map((offer) => {
            const offerDaysLeft = RedemptionService.getDaysUntilExpiry(offer);
            return (
              <div
                key={offer.id}
                className="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => {
                  if (onOfferSelect) {
                    onOfferSelect(offer);
                    setShowDetails(false);
                  }
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getEventIcon(offer.event_type)}</span>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {offer.event_name || `${offer.event_type} Event`}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(offer.event_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}%`
                      : offer.discount_type === 'fixed_amount'
                      ? `₱${offer.discount_value}`
                      : 'Complimentary'}
                  </Badge>
                </div>

                {offer.offer_description && (
                  <p className="text-sm text-gray-600 mb-2">{offer.offer_description}</p>
                )}

                <div className="flex items-center justify-between text-xs">
                  <div className="text-gray-500">
                    Valid until: {new Date(offer.offer_valid_until || '').toLocaleDateString()}
                  </div>
                  {offerDaysLeft !== null && offerDaysLeft > 0 && (
                    <div
                      className={`font-medium ${
                        offerDaysLeft <= 3 ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {offerDaysLeft} {offerDaysLeft === 1 ? 'day' : 'days'} left
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-4 pt-3 border-t text-center">
            <p className="text-xs text-gray-500">
              Click an offer to apply it to the order
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
