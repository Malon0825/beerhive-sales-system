'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { Customer } from '@/models/entities/Customer';
import { RestaurantTable } from '@/models/entities/Table';
import { useCart } from '@/lib/contexts/CartContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shared/ui/tabs';
import { Card } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { Search, Grid, List, User, Armchair, CheckCircle } from 'lucide-react';
import { Input } from '../shared/ui/input';
import { CustomerSearch } from './CustomerSearch';
import { TableSelector } from './TableSelector';
import { PaymentPanel } from './PaymentPanel';

/**
 * POSInterface - Main POS Component
 * Displays product grid and order summary
 * Features:
 * - Product browsing and selection
 * - Customer search and selection
 * - Table assignment
 * - Order summary with cart management
 */
export function POSInterface() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const cart = useCart();

  /**
   * Fetch products from API
   */
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle customer selection from CustomerSearch dialog
   */
  const handleSelectCustomer = (customer: Customer) => {
    cart.setCustomer(customer);
  };

  /**
   * Handle table selection from TableSelector dialog
   */
  const handleSelectTable = (table: RestaurantTable) => {
    cart.setTable(table);
  };

  /**
   * Handle payment completion
   */
  const handlePaymentComplete = (orderId: string) => {
    // Show success message
    setSuccessMessage(`Order created successfully! Order ID: ${orderId}`);
    
    // Clear cart
    cart.clearCart();
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 relative">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        <Card className="flex-1 overflow-auto p-4">
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="beer">Beer</TabsTrigger>
              <TabsTrigger value="food">Food</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading products...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card
                      key={product.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => cart.addItem(product)}
                    >
                      <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <Grid className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
                      <p className="text-lg font-bold text-amber-600">
                        ₱{product.base_price.toFixed(2)}
                      </p>
                      {product.current_stock && product.current_stock <= product.reorder_point && (
                        <p className="text-xs text-red-600 mt-1">Low Stock</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No products found
                </div>
              )}
            </TabsContent>

            <TabsContent value="featured">
              <div className="text-center py-8 text-gray-500">
                Featured products will appear here
              </div>
            </TabsContent>

            <TabsContent value="beer">
              <div className="text-center py-8 text-gray-500">
                Beer products will appear here
              </div>
            </TabsContent>

            <TabsContent value="food">
              <div className="text-center py-8 text-gray-500">
                Food products will appear here
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Right Panel - Order Summary */}
      <div className="w-96">
        <Card className="h-full flex flex-col p-4">
          <h2 className="text-lg font-bold mb-4">Current Order</h2>

          {/* Customer & Table Info */}
          <div className="mb-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => setShowCustomerSearch(true)}
            >
              <User className="h-4 w-4 mr-2" />
              {cart.customer ? cart.customer.full_name : 'Select Customer'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={() => setShowTableSelector(true)}
            >
              <Armchair className="h-4 w-4 mr-2" />
              {cart.table ? `Table ${cart.table.table_number}` : 'Select Table'}
            </Button>
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-auto mb-4">
            {cart.items.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <List className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No items in cart</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.items.map(item => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">₱{item.unitPrice.toFixed(2)} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cart.removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                      <span className="ml-auto font-bold">
                        ₱{item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₱{cart.getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>₱0.00</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-amber-600">₱{cart.getTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
              disabled={cart.items.length === 0}
              onClick={() => setShowPaymentPanel(true)}
            >
              Proceed to Payment
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => cart.clearCart()}
                disabled={cart.items.length === 0}
              >
                Clear
              </Button>
              <Button variant="outline" disabled={cart.items.length === 0}>
                Hold
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Search Dialog */}
      <CustomerSearch
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Table Selector Dialog */}
      <TableSelector
        open={showTableSelector}
        onOpenChange={setShowTableSelector}
        onSelectTable={handleSelectTable}
      />

      {/* Payment Panel Dialog */}
      <PaymentPanel
        open={showPaymentPanel}
        onOpenChange={setShowPaymentPanel}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
            <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Payment Successful!</p>
              <p className="text-sm opacity-90">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
