'use client';

import { useState, useEffect } from 'react';
import { HappyHour } from '@/models/entities/HappyHour';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { Label } from '../shared/ui/Label';

interface HappyHourFormProps {
  happyHour: HappyHour | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function HappyHourForm({ happyHour, onSuccess, onCancel }: HappyHourFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '15:00:00',
    end_time: '18:00:00',
    days_of_week: [] as number[],
    valid_from: '',
    valid_until: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'complimentary',
    discount_value: 0,
    applies_to_all_products: true,
    min_order_amount: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (happyHour) {
      setFormData({
        name: happyHour.name,
        description: happyHour.description || '',
        start_time: happyHour.start_time,
        end_time: happyHour.end_time,
        days_of_week: happyHour.days_of_week || [],
        valid_from: happyHour.valid_from || '',
        valid_until: happyHour.valid_until || '',
        discount_type: happyHour.discount_type,
        discount_value: happyHour.discount_value,
        applies_to_all_products: happyHour.applies_to_all_products,
        min_order_amount: happyHour.min_order_amount?.toString() || '',
      });
    }
  }, [happyHour]);

  const handleDayToggle = (day: number) => {
    setFormData((prev) => {
      const days = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort();
      return { ...prev, days_of_week: days };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        discount_value: Number(formData.discount_value),
        min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      const url = happyHour ? `/api/happy-hours/${happyHour.id}` : '/api/happy-hours';
      const method = happyHour ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to save happy hour');
      }
    } catch (error) {
      console.error('Save happy hour error:', error);
      alert('Failed to save happy hour');
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Afternoon Happy Hour"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Optional description"
        />
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time.substring(0, 5)}
            onChange={(e) => setFormData({ ...formData, start_time: `${e.target.value}:00` })}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time.substring(0, 5)}
            onChange={(e) => setFormData({ ...formData, end_time: `${e.target.value}:00` })}
            required
          />
        </div>
      </div>

      {/* Days of Week */}
      <div>
        <Label>Days of Week *</Label>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-2">
          {dayNames.map((day, index) => {
            const dayNumber = index + 1;
            const isSelected = formData.days_of_week.includes(dayNumber);
            return (
              <button
                key={dayNumber}
                type="button"
                onClick={() => handleDayToggle(dayNumber)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valid_from">Valid From</Label>
          <Input
            id="valid_from"
            type="date"
            value={formData.valid_from}
            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="valid_until">Valid Until</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
          />
        </div>
      </div>

      {/* Discount Type */}
      <div>
        <Label htmlFor="discount_type">Discount Type *</Label>
        <select
          id="discount_type"
          value={formData.discount_type}
          onChange={(e) =>
            setFormData({
              ...formData,
              discount_type: e.target.value as 'percentage' | 'fixed_amount' | 'complimentary',
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="percentage">Percentage</option>
          <option value="fixed_amount">Fixed Amount</option>
          <option value="complimentary">Complimentary</option>
        </select>
      </div>

      {/* Discount Value */}
      {formData.discount_type !== 'complimentary' && (
        <div>
          <Label htmlFor="discount_value">
            Discount Value * {formData.discount_type === 'percentage' ? '(%)' : '(₱)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            min="0"
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
            required
          />
        </div>
      )}

      {/* Applies to All Products */}
      <div className="flex items-center gap-2">
        <input
          id="applies_to_all_products"
          type="checkbox"
          checked={formData.applies_to_all_products}
          onChange={(e) =>
            setFormData({ ...formData, applies_to_all_products: e.target.checked })
          }
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="applies_to_all_products" className="mb-0">
          Apply to all products
        </Label>
      </div>

      {/* Minimum Order Amount */}
      <div>
        <Label htmlFor="min_order_amount">Minimum Order Amount (₱)</Label>
        <Input
          id="min_order_amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.min_order_amount}
          onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
          placeholder="Optional minimum order amount"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : happyHour ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
