'use client';

import { useState, useEffect } from 'react';
import { HappyHour } from '@/models/entities/HappyHour';
import HappyHourList from './HappyHourList';
import HappyHourForm from './HappyHourForm';
import { Button } from '../shared/ui/Button';
import { Plus } from 'lucide-react';

export default function HappyHourManager() {
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHappyHour, setEditingHappyHour] = useState<HappyHour | null>(null);

  useEffect(() => {
    loadHappyHours();
  }, []);

  const loadHappyHours = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/happy-hours');
      const result = await response.json();

      if (result.success) {
        setHappyHours(result.data);
      }
    } catch (error) {
      console.error('Load happy hours error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingHappyHour(null);
    setShowForm(true);
  };

  const handleEdit = (happyHour: HappyHour) => {
    setEditingHappyHour(happyHour);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingHappyHour(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingHappyHour(null);
    loadHappyHours();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this happy hour?')) {
      return;
    }

    try {
      const response = await fetch(`/api/happy-hours/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        loadHappyHours();
      } else {
        alert(result.error || 'Failed to delete happy hour');
      }
    } catch (error) {
      console.error('Delete happy hour error:', error);
      alert('Failed to delete happy hour');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Happy Hour Management</h1>
          <p className="text-gray-600 mt-1">Create and manage time-based pricing promotions</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Happy Hour
        </Button>
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingHappyHour ? 'Edit Happy Hour' : 'Create New Happy Hour'}
          </h2>
          <HappyHourForm
            happyHour={editingHappyHour}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </div>
      ) : null}

      <HappyHourList
        happyHours={happyHours}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={loadHappyHours}
      />
    </div>
  );
}
