'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CreateCustomerInput } from '@/models/entities/Customer';
import { CustomerTier } from '@/models/enums/CustomerTier';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../shared/ui/dialog';
import { Input } from '../shared/ui/input';
import { Button } from '../shared/ui/button';
import { Label } from '../shared/ui/label';
import { Badge } from '../shared/ui/badge';
import { Search, UserPlus, User, Phone, Mail, Star, Calendar } from 'lucide-react';

interface CustomerSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer: (customer: Customer) => void;
}

/**
 * CustomerSearch Component
 * Allows cashiers to search for existing customers or quickly register new ones
 * Features:
 * - Real-time search by name, phone, or customer number
 * - Display customer details including VIP status
 * - Quick registration form for walk-in customers
 */
export function CustomerSearch({ open, onOpenChange, onSelectCustomer }: CustomerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registering, setRegistering] = useState(false);

  // New customer form state
  const [newCustomer, setNewCustomer] = useState<CreateCustomerInput>({
    full_name: '',
    phone: '',
    email: '',
    birth_date: '',
    anniversary_date: '',
    tier: 'regular' as CustomerTier,
  });

  /**
   * Search for customers by query
   * Debounced search with minimum 2 characters
   */
  const searchCustomers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data);
      } else {
        console.error('Search error:', result.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Debounce search to avoid excessive API calls
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchCustomers(searchQuery);
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchCustomers]);

  /**
   * Handle customer selection
   */
  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    onOpenChange(false);
    resetForm();
  };

  /**
   * Register new customer
   */
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomer.full_name.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      setRegistering(true);
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      const result = await response.json();

      if (result.success) {
        handleSelectCustomer(result.data);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error registering customer:', error);
      alert('Failed to register customer');
    } finally {
      setRegistering(false);
    }
  };

  /**
   * Reset form and close dialog
   */
  const resetForm = () => {
    setSearchQuery('');
    setCustomers([]);
    setShowRegistration(false);
    setNewCustomer({
      full_name: '',
      phone: '',
      email: '',
      birth_date: '',
      anniversary_date: '',
      tier: 'regular' as CustomerTier,
    });
  };

  /**
   * Get tier badge color
   */
  const getTierBadgeColor = (tier: CustomerTier) => {
    switch (tier) {
      case 'vip_platinum':
        return 'bg-gray-800 text-white';
      case 'vip_gold':
        return 'bg-yellow-500 text-white';
      case 'vip_silver':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  /**
   * Format tier display name
   */
  const formatTier = (tier: CustomerTier) => {
    switch (tier) {
      case 'vip_platinum':
        return 'VIP Platinum';
      case 'vip_gold':
        return 'VIP Gold';
      case 'vip_silver':
        return 'VIP Silver';
      default:
        return 'Regular';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {showRegistration ? 'Register New Customer' : 'Select Customer'}
          </DialogTitle>
          <DialogDescription>
            {showRegistration
              ? 'Fill in customer details for quick registration'
              : 'Search for existing customer or register a new one'}
          </DialogDescription>
        </DialogHeader>

        {!showRegistration ? (
          <>
            {/* Search Section */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, or customer number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {loading && (
                  <div className="text-center py-8 text-gray-500">
                    Searching...
                  </div>
                )}

                {!loading && searchQuery && customers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No customers found. Try a different search or register a new customer.
                  </div>
                )}

                {!loading && customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base">{customer.full_name}</h4>
                          {customer.tier !== 'regular' && (
                            <Badge className={getTierBadgeColor(customer.tier)}>
                              <Star className="h-3 w-3 mr-1" />
                              {formatTier(customer.tier)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{customer.customer_number}</span>
                          </div>
                          
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                        </div>

                        {customer.last_visit_date && (
                          <div className="mt-2 text-xs text-gray-500">
                            Last visit: {new Date(customer.last_visit_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Register New Customer Button */}
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowRegistration(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Register New Customer
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Registration Form */}
            <form onSubmit={handleRegisterCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={newCustomer.full_name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, full_name: e.target.value })
                  }
                  placeholder="Juan Dela Cruz"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    placeholder="09171234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    placeholder="juan@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Birth Date (Optional)
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={newCustomer.birth_date}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, birth_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anniversary_date">
                    <Calendar className="inline h-3 w-3 mr-1" />
                    Anniversary Date (Optional)
                  </Label>
                  <Input
                    id="anniversary_date"
                    type="date"
                    value={newCustomer.anniversary_date}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, anniversary_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRegistration(false)}
                  disabled={registering}
                >
                  Back to Search
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={registering || !newCustomer.full_name.trim()}
                >
                  {registering ? 'Registering...' : 'Register & Select'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
