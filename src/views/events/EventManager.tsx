'use client';

import { useState, useEffect } from 'react';
import { CustomerEvent } from '@/models/entities/CustomerEvent';
import EventList from './EventList';
import EventForm from './EventForm';
import { Button } from '../shared/ui/button';
import { Plus, Calendar, Filter } from 'lucide-react';

export default function EventManager() {
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CustomerEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'redeemed'>('all');

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      let url = '/api/events';
      
      if (filter === 'active') {
        url += '?is_redeemed=false';
      } else if (filter === 'redeemed') {
        url += '?is_redeemed=true';
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error('Load events error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowForm(true);
  };

  const handleEdit = (event: CustomerEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEvent(null);
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadEvents();
      } else {
        alert(result.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Delete event error:', error);
      alert('Failed to delete event');
    }
  };

  const activeCount = events.filter((e) => !e.is_redeemed).length;
  const redeemedCount = events.filter((e) => e.is_redeemed).length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Events</h1>
          <p className="text-gray-600 mt-1">Manage birthday, anniversary, and special event offers</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Event
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Total Events</div>
              <div className="text-2xl font-bold text-gray-900">{events.length}</div>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active Offers</div>
              <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Redeemed</div>
              <div className="text-2xl font-bold text-purple-600">{redeemedCount}</div>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              ✓
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">Filter:</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active Offers
          </button>
          <button
            onClick={() => setFilter('redeemed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'redeemed'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Redeemed
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <EventForm
            event={editingEvent}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </div>
      )}

      <EventList
        events={events}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadEvents}
      />
    </div>
  );
}
