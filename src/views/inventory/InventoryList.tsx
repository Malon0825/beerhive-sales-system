'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { Edit, AlertCircle, CheckCircle, XCircle, Power, Eye, EyeOff } from 'lucide-react';
import StockAdjustmentDialog from './StockAdjustmentDialog';
import EditProductDialog from './EditProductDialog';
import { toast } from '@/lib/hooks/useToast';

interface InventoryListProps {
  onStatsUpdate?: (stats: {
    total: number;
    lowStock: number;
    outOfStock: number;
    adequate: number;
  }) => void;
}

/**
 * InventoryList Component
 * Displays inventory products with edit, toggle active, and stock adjustment features
 */
export default function InventoryList({ onStatsUpdate }: InventoryListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * Load all products from API
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?includeInactive=true');
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
        updateStats(result.data || []);
      }
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update statistics for dashboard
   */
  const updateStats = (productList: Product[]) => {
    if (!onStatsUpdate) return;

    // Only count active products for stats
    const activeProducts = productList.filter(p => p.is_active !== false);

    const stats = {
      total: activeProducts.length,
      lowStock: activeProducts.filter(
        (p) => p.current_stock <= p.reorder_point && p.current_stock > 0
      ).length,
      outOfStock: activeProducts.filter((p) => p.current_stock <= 0).length,
      adequate: activeProducts.filter((p) => p.current_stock > p.reorder_point).length,
    };

    onStatsUpdate(stats);
  };

  /**
   * Filter products by search term and active/inactive status
   */
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActiveFilter = showInactive ? true : (product.is_active !== false);
    
    return matchesSearch && matchesActiveFilter;
  });

  /**
   * Handle opening adjustment dialog for a product
   */
  const handleAdjustClick = (product: Product) => {
    setSelectedProduct(product);
    setIsAdjustDialogOpen(true);
  };

  /**
   * Handle opening edit dialog for a product
   */
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  /**
   * Toggle product active/inactive status
   */
  const handleToggleActive = async (product: Product) => {
    const newStatus = !product.is_active;
    const action = newStatus ? 'activated' : 'deactivated';

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: `Product ${action}`,
          description: `${product.name} has been ${action}.`,
        });
        loadProducts();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${action.slice(0, -1)} product`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating the product status',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle successful stock adjustment
   */
  const handleAdjustmentSuccess = () => {
    toast({
      title: 'Stock adjusted successfully',
      description: 'Inventory has been updated.',
    });
    loadProducts();
  };

  /**
   * Handle successful product edit
   */
  const handleEditSuccess = () => {
    toast({
      title: 'Product updated successfully',
      description: 'Product details have been updated.',
    });
    loadProducts();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          variant={showInactive ? 'default' : 'outline'}
          onClick={() => setShowInactive(!showInactive)}
          className="flex items-center gap-2"
        >
          {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showInactive ? 'Showing Inactive' : 'Show Inactive'}
        </Button>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reorder Threshold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const status = InventoryService.getStockStatus(
                product.current_stock,
                product.reorder_point
              );
              const stockValue = InventoryService.calculateStockValue(
                product.current_stock,
                product.cost_price || 0
              );
              const isInactive = product.is_active === false;

              return (
                <tr 
                  key={product.id} 
                  className={`hover:bg-gray-50 ${isInactive ? 'bg-gray-100 opacity-60' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      {isInactive && (
                        <Badge variant="secondary" className="bg-gray-500 text-white text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {InventoryService.formatStockLevel(
                        product.current_stock,
                        product.unit_of_measure
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {product.reorder_point} {product.unit_of_measure}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StockStatusBadge status={status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₱{stockValue.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleEditClick(product)}
                        title="Edit product"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleAdjustClick(product)}
                        disabled={isInactive}
                        title="Adjust stock"
                      >
                        <Edit className="w-4 h-4" />
                        Stock
                      </Button>
                      <Button 
                        variant={isInactive ? 'default' : 'outline'}
                        size="sm" 
                        className={`flex items-center gap-1 ${isInactive ? 'bg-green-600 hover:bg-green-700' : 'text-red-600 hover:bg-red-50'}`}
                        onClick={() => handleToggleActive(product)}
                        title={isInactive ? 'Activate product' : 'Deactivate product'}
                      >
                        <Power className="w-4 h-4" />
                        {isInactive ? 'Activate' : 'Deactivate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No products found
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <EditProductDialog
        product={selectedProduct}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={isAdjustDialogOpen}
        onOpenChange={setIsAdjustDialogOpen}
        product={selectedProduct}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}

function StockStatusBadge({ status }: { status: string }) {
  const config = {
    out_of_stock: {
      label: 'Out of Stock',
      variant: 'destructive' as const,
      icon: XCircle,
    },
    low_stock: {
      label: 'Low Stock',
      variant: 'warning' as const,
      icon: AlertCircle,
    },
    warning: {
      label: 'Warning',
      variant: 'secondary' as const,
      icon: AlertCircle,
    },
    adequate: {
      label: 'Adequate',
      variant: 'success' as const,
      icon: CheckCircle,
    },
  };

  const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.adequate;

  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
