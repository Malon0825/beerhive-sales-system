'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/views/shared/ui/button';
import { Input } from '@/views/shared/ui/input';
import { Label } from '@/views/shared/ui/label';
import { Card } from '@/views/shared/ui/card';
import { CustomerTier } from '@/models/enums/CustomerTier';
import { Customer, UpdateCustomerInput } from '@/models/entities/Customer';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CustomerEditFormProps {
  customerId: string;
}

/**
 * CustomerEditForm Component
 * Form for editing existing customer information
 * Features:
 * - Pre-populated with existing customer data
 * - Full name validation (required)
 * - Optional contact information (phone, email)
 * - Optional birthday and anniversary tracking
 * - VIP tier selection
 * - Notes field for additional information
 */
export default function CustomerEditForm({ customerId }: CustomerEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState<UpdateCustomerInput>({
    full_name: '',
    phone: '',
    email: '',
    birth_date: '',
    anniversary_date: '',
    tier: CustomerTier.REGULAR,
    notes: '',
  });

  /**
   * Fetch customer data on mount
   */
  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  /**
   * Fetch existing customer data
   */
  const fetchCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch customer');
      }

      const customerData = result.data.customer;
      setCustomer(customerData);

      // Pre-populate form with existing data
      setFormData({
        full_name: customerData.full_name || '',
        phone: customerData.phone || '',
        email: customerData.email || '',
        birth_date: customerData.birth_date || '',
        anniversary_date: customerData.anniversary_date || '',
        tier: customerData.tier || CustomerTier.REGULAR,
        notes: customerData.notes || '',
      });
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): string | null => {
    if (!formData.full_name?.trim()) {
      return 'Full name is required';
    }

    if (formData.email && !formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }

    if (formData.phone && formData.phone.trim().length < 10) {
      return 'Please enter a valid phone number';
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare data - remove empty optional fields
      const submitData: UpdateCustomerInput = {
        full_name: formData.full_name?.trim(),
        tier: formData.tier,
      };

      if (formData.phone?.trim()) {
        submitData.phone = formData.phone.trim();
      }
      if (formData.email?.trim()) {
        submitData.email = formData.email.trim();
      }
      if (formData.birth_date) {
        submitData.birth_date = formData.birth_date;
      }
      if (formData.anniversary_date) {
        submitData.anniversary_date = formData.anniversary_date;
      }
      if (formData.notes?.trim()) {
        submitData.notes = formData.notes.trim();
      }

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update customer');
      }

      // Redirect to customer detail on success
      router.push(`/customers/${customerId}`);
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-6">
        <Link href="/customers">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Error loading customer</p>
          <p className="text-red-500 text-sm mt-2">{error}</p>
          <Button onClick={fetchCustomer} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/customers/${customerId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customer Details
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Customer</h1>
        <p className="text-gray-600 mt-1">Update customer information</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Basic Information
            </h2>

            {/* Full Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter customer's full name"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09XX XXX XXXX"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          {/* Special Dates */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Special Dates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birth_date">Birth Date</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500">For birthday offers</p>
              </div>

              {/* Anniversary Date */}
              <div className="space-y-2">
                <Label htmlFor="anniversary_date">Anniversary Date</Label>
                <Input
                  id="anniversary_date"
                  name="anniversary_date"
                  type="date"
                  value={formData.anniversary_date}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500">For anniversary offers</p>
              </div>
            </div>
          </div>

          {/* VIP Tier */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Membership
            </h2>

            <div className="space-y-2">
              <Label htmlFor="tier">VIP Tier</Label>
              <select
                id="tier"
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={CustomerTier.REGULAR}>Regular</option>
                <option value={CustomerTier.VIP_SILVER}>VIP Silver</option>
                <option value={CustomerTier.VIP_GOLD}>VIP Gold</option>
                <option value={CustomerTier.VIP_PLATINUM}>VIP Platinum</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Additional Information
            </h2>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about the customer..."
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Link href={`/customers/${customerId}`}>
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
