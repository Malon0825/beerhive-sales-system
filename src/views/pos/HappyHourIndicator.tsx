'use client';

import { useState, useEffect } from 'react';
import { HappyHour } from '@/models/entities/HappyHour';
import { HappyHourUtils } from '@/core/services/pricing/HappyHourUtils';
import { Clock, Percent, Info } from 'lucide-react';
import { Badge } from '../shared/ui/Badge';

export default function HappyHourIndicator() {
  const [activeHappyHours, setActiveHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadActiveHappyHours();
    
    // Refresh every minute
    const interval = setInterval(loadActiveHappyHours, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveHappyHours = async () => {
    try {
      const response = await fetch('/api/happy-hours/active');
      const result = await response.json();

      if (result.success) {
        setActiveHappyHours(result.data);
      }
    } catch (error) {
      console.error('Load active happy hours error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (activeHappyHours.length === 0) {
    return null;
  }

  const primaryHappyHour = activeHappyHours[0];

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-3 rounded-lg shadow-lg hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" />
            <div className="text-left">
              <div className="font-bold text-sm">HAPPY HOUR ACTIVE!</div>
              <div className="text-xs opacity-90">
                {primaryHappyHour.name} • {HappyHourUtils.formatTimeWindow(primaryHappyHour)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="bg-white text-orange-600 font-bold">
              {primaryHappyHour.discount_type === 'percentage'
                ? `${primaryHappyHour.discount_value}% OFF`
                : primaryHappyHour.discount_type === 'fixed_amount'
                ? `₱${primaryHappyHour.discount_value} OFF`
                : 'FREE'}
            </Badge>
            <Info className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          {activeHappyHours.map((hh) => (
            <div key={hh.id} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0">
              <div className="font-semibold text-gray-900 mb-1">{hh.name}</div>
              {hh.description && (
                <p className="text-sm text-gray-600 mb-2">{hh.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="info">
                  <Clock className="w-3 h-3 mr-1" />
                  {HappyHourUtils.formatTimeWindow(hh)}
                </Badge>
                <Badge variant="success">
                  <Percent className="w-3 h-3 mr-1" />
                  {hh.discount_type === 'percentage'
                    ? `${hh.discount_value}%`
                    : hh.discount_type === 'fixed_amount'
                    ? `₱${hh.discount_value}`
                    : 'Complimentary'}
                </Badge>
                {hh.applies_to_all_products && (
                  <Badge variant="secondary">All Products</Badge>
                )}
                {hh.min_order_amount && (
                  <Badge variant="warning">Min: ₱{hh.min_order_amount}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
