'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/models/entities/Product';
import { ProductCategory } from '@/models/entities/Category';
import { InventoryService } from '@/core/services/inventory/InventoryService';
import { Badge } from '../shared/ui/badge';
import { Button } from '../shared/ui/button';
import { 
  Edit, AlertCircle, CheckCircle, XCircle, Power, Eye, EyeOff,
  LayoutGrid, List, Package, DollarSign, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import StockAdjustmentDialog from './StockAdjustmentDialog';
import EditProductDialog from './EditProductDialog';
import { toast } from '@/lib/hooks/useToast';
import { PackageImpactSection, PackageImpactBadge } from './components/PackageImpactSection';

interface InventoryListResponsiveProps {
  onStatsUpdate?: (stats: {
    total: number;
    lowStock: number;
    outOfStock: number;
    adequate: number;
  }) => void;
  onProductsLoad?: (products: Product[]) => void;
}

type ViewMode = 'card' | 'table';

/**
 * InventoryListResponsive Component
 * Displays inventory with responsive card/table toggle view
 */
export default function InventoryListResponsive({ 
  onStatsUpdate, 
  onProductsLoad 
}: InventoryListResponsiveProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  /**
   * Load all categories from API
   */
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();

      if (result.success) {
        setCategories(result.data || []);
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  /**
   * Load all products from API
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory 
        ? `/api/products?includeInactive=true&categoryId=${selectedCategory}`
        : '/api/products?includeInactive=true';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setProducts(result.data || []);
        updateStats(result.data || []);
        if (onProductsLoad) {
          onProductsLoad(result.data || []);
        }
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
   * Filter products by search term, category, and active/inactive status
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

  /**
   * Toggle package impact section for a product
   */
  const togglePackageImpact = (productId: string) => {
    setExpandedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky Control Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 pb-4 -mx-6 px-6 pt-4">
        <div className="flex flex-col gap-3">
          {/* Search and Category Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* View Toggle and Filters Row */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'card' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2"
            >
              {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {showInactive ? 'Hide Inactive' : 'Show Inactive'}
              </span>
            </Button>
          </div>
        </div>

        {/* Results Count and Active Filters */}
        <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          {selectedCategory && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {categories.find(c => c.id === selectedCategory)?.name}
              <button
                onClick={() => setSelectedCategory('')}
                className="ml-1 hover:text-gray-900"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      </div>

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

            const isExpanded = expandedProductIds.has(product.id);

            return (
              <div
                key={product.id}
                className={`rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${
                  isInactive 
                    ? 'border-gray-300 bg-gray-50 opacity-70' 
                    : status === 'out_of_stock'
                    ? 'border-red-200 bg-red-50'
                    : status === 'low_stock'
                    ? 'border-orange-200 bg-orange-50'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                      {/* Package Impact Badge */}
                      <div className="mt-2">
                        <PackageImpactBadge 
                          productId={product.id}
                          onClick={() => togglePackageImpact(product.id)}
                        />
                      </div>
                    </div>
                    <StockStatusBadge status={status} />
                  </div>
                  {isInactive && (
                    <Badge variant="secondary" className="bg-gray-500 text-white text-xs mt-2">
                      Inactive
                    </Badge>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Stock Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600 font-medium mb-1">Current Stock</div>
                      <div className="text-xl font-bold text-blue-900">
                        {product.current_stock}
                      </div>
                      <div className="text-xs text-blue-700">{product.unit_of_measure}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600 font-medium mb-1">Reorder Point</div>
                      <div className="text-xl font-bold text-gray-900">
                        {product.reorder_point}
                      </div>
                      <div className="text-xs text-gray-600">{product.unit_of_measure}</div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Stock Value</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">
                      ₱{stockValue.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1"
                    onClick={() => handleEditClick(product)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1"
                    onClick={() => handleAdjustClick(product)}
                    disabled={isInactive}
                  >
                    <Package className="w-4 h-4" />
                    Adjust
                  </Button>
                  <Button
                    variant={isInactive ? 'default' : 'outline'}
                    size="sm"
                    className={`flex items-center justify-center gap-1 ${
                      isInactive 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    onClick={() => handleToggleActive(product)}
                  >
                    <Power className="w-4 h-4" />
                  </Button>
                </div>

                {/* Expandable Package Impact Section */}
                {isExpanded && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <PackageImpactSection 
                      productId={product.id}
                      productName={product.name}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8"></th>
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
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
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
                  const isExpanded = expandedProductIds.has(product.id);

                  return (
                    <>
                      <tr 
                        key={product.id} 
                        className={`transition-colors ${
                          isInactive 
                            ? 'bg-gray-100 opacity-60' 
                            : status === 'out_of_stock'
                            ? 'bg-red-50 hover:bg-red-100'
                            : status === 'low_stock'
                            ? 'bg-orange-50 hover:bg-orange-100'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-4">
                          <button
                            onClick={() => togglePackageImpact(product.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Toggle package impact"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              {isInactive && (
                                <Badge variant="secondary" className="bg-gray-500 text-white text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            {/* Package Impact Badge */}
                            <PackageImpactBadge 
                              productId={product.id}
                              onClick={() => togglePackageImpact(product.id)}
                            />
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
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 ${
                        isInactive 
                          ? 'bg-gray-100' 
                          : status === 'out_of_stock'
                          ? 'bg-red-50'
                          : status === 'low_stock'
                          ? 'bg-orange-50'
                          : 'bg-white'
                      }`}>
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleAdjustClick(product)}
                            disabled={isInactive}
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant={isInactive ? 'default' : 'outline'}
                            size="sm" 
                            className={`${isInactive ? 'bg-green-600 hover:bg-green-700' : 'text-red-600 hover:bg-red-50'}`}
                            onClick={() => handleToggleActive(product)}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Package Impact Row */}
                    {isExpanded && (
                      <tr key={`${product.id}-expanded`}>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <PackageImpactSection 
                            productId={product.id}
                            productName={product.name}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding a product'}
            </p>
          </div>
        </div>
      )}

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

/**
 * Stock Status Badge Component
 */
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
