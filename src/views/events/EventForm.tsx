'use client';

import { useState, useEffect } from 'react';
import { CustomerEvent } from '@/models/entities/CustomerEvent';
import { EventType } from '@/models/enums/EventType';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { Label } from '../shared/ui/Label';

interface EventFormProps {
  event: CustomerEvent | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState({
    customer_id: '',
    event_type: EventType.BIRTHDAY,
    event_date: '',
    event_name: '',
    offer_description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount' | 'complimentary',
    discount_value: '' as any,
    free_item_product_id: '',
    offer_valid_from: '',
    offer_valid_until: '',
    notes: '',
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();

    if (event) {
      setFormData({
        customer_id: event.customer_id,
        event_type: event.event_type,
        event_date: event.event_date,
        event_name: event.event_name || '',
        offer_description: event.offer_description || '',
        discount_type: event.discount_type || 'percentage',
        discount_value: event.discount_value || '' as any,
        free_item_product_id: event.free_item_product_id || '',
        offer_valid_from: event.offer_valid_from || '',
        offer_valid_until: event.offer_valid_until || '',
        notes: event.notes || '',
      });
    }
  }, [event]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetch('/api/customers');
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Load customers error:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        discount_value: formData.discount_value ? Number(formData.discount_value) : null,
        free_item_product_id: formData.free_item_product_id || null,
        offer_valid_from: formData.offer_valid_from || null,
        offer_valid_until: formData.offer_valid_until || null,
        event_name: formData.event_name || null,
        notes: formData.notes || null,
      };

      const url = event ? `/api/events/${event.id}` : '/api/events';
      const method = event ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(result.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Save event error:', error);
      alert('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeChange = (type: EventType) => {
    setFormData({ ...formData, event_type: type });

    // Auto-populate offer description based on type
    if (type === EventType.BIRTHDAY) {
      setFormData((prev) => ({
        ...prev,
        event_type: type,
        offer_description: 'Happy Birthday! Enjoy a special discount on your celebration.',
      }));
    } else if (type === EventType.ANNIVERSARY) {
      setFormData((prev) => ({
        ...prev,
        event_type: type,
        offer_description: 'Happy Anniversary! Celebrate with a special offer.',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div>
        <Label htmlFor="customer_id">Customer *</Label>
        <select
          id="customer_id"
          value={formData.customer_id}
          onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={!!event}
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.full_name} ({customer.customer_number})
            </option>
          ))}
        </select>
        {loadingCustomers && (
          <div className="text-sm text-gray-500 mt-1">Loading customers...</div>
        )}
      </div>

      {/* Event Type */}
      <div>
        <Label>Event Type *</Label>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => handleEventTypeChange(EventType.BIRTHDAY)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              formData.event_type === EventType.BIRTHDAY
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎂 Birthday
          </button>
          <button
            type="button"
            onClick={() => handleEventTypeChange(EventType.ANNIVERSARY)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              formData.event_type === EventType.ANNIVERSARY
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💝 Anniversary
          </button>
          <button
            type="button"
            onClick={() => handleEventTypeChange(EventType.CUSTOM)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              formData.event_type === EventType.CUSTOM
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎁 Custom
          </button>
        </div>
      </div>

      {/* Event Name (for custom events) */}
      {formData.event_type === EventType.CUSTOM && (
        <div>
          <Label htmlFor="event_name">Event Name *</Label>
          <Input
            id="event_name"
            value={formData.event_name}
            onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
            required={formData.event_type === EventType.CUSTOM}
            placeholder="e.g., Graduation, Promotion"
          />
        </div>
      )}

      {/* Event Date */}
      <div>
        <Label htmlFor="event_date">Event Date *</Label>
        <Input
          id="event_date"
          type="date"
          value={formData.event_date}
          onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
          required
        />
      </div>

      {/* Offer Description */}
      <div>
        <Label htmlFor="offer_description">Offer Description</Label>
        <textarea
          id="offer_description"
          value={formData.offer_description}
          onChange={(e) => setFormData({ ...formData, offer_description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe the special offer"
        />
      </div>

      {/* Discount Type */}
      <div>
        <Label htmlFor="discount_type">Discount Type</Label>
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
            Discount Value {formData.discount_type === 'percentage' ? '(%)' : '(₱)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step="0.01"
            min="0"
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
          />
        </div>
      )}

      {/* Validity Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="offer_valid_from">Offer Valid From</Label>
          <Input
            id="offer_valid_from"
            type="date"
            value={formData.offer_valid_from}
            onChange={(e) => setFormData({ ...formData, offer_valid_from: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="offer_valid_until">Offer Valid Until</Label>
          <Input
            id="offer_valid_until"
            type="date"
            value={formData.offer_valid_until}
            onChange={(e) => setFormData({ ...formData, offer_valid_until: e.target.value })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Additional notes (internal use)"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : event ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
