// @ts-nocheck - Supabase query result type inference issues
'use client';

/**
 * Top Products Table Component
 * Display top selling products in a table format
 */

import type React from 'react';
import { useState } from 'react';
import { TrendingUp, Package, ChevronsDown, ChevronsUp } from 'lucide-react';

interface ProductData {
  product_id?: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
  item_type?: 'product' | 'package';
  net_income?: number | null;
  cost_price?: number | null;
}

interface TopProductsTableProps {
  products: ProductData[];
  title?: string;
  limit?: number;
  hideRevenue?: boolean;
  rightActions?: React.ReactNode;
  switching?: boolean;
  enterFrom?: 'left' | 'right';
  enterAnim?: boolean;
}

export function TopProductsTable({ products, title = 'Top Selling Products', limit = 10, hideRevenue = false, rightActions, switching = false, enterFrom = 'right', enterAnim = false }: TopProductsTableProps) {
  const displayProducts = products.slice(0, limit);
  const [expanded, setExpanded] = useState<Record<string, { open: boolean; loading: boolean; items: Array<{ name: string; quantity: number }> }>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-PH').format(value);
  };

  if (!products || products.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package className="w-12 h-12 mb-2 opacity-50" />
          <p>No product data available for the selected period</p>
        </div>
      </div>
    );
  }

  // Calculate total for percentages
  const totalRevenue = hideRevenue ? 0 : products.reduce((sum, p) => sum + p.total_revenue, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {rightActions ? (
            <div className="flex items-center">{rightActions}</div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 sticky top-0 bg-gray-50 z-10">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                Product Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                Quantity Sold
              </th>
              {!hideRevenue && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                  Revenue
                </th>
              )}
              {!hideRevenue && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                  Net Income
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                Orders
              </th>
              {!hideRevenue && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                  % of Total
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-200 transform transition-all duration-300 ${
            switching
              ? 'opacity-0'
              : enterAnim
                ? (enterFrom === 'left' ? 'opacity-0 -translate-x-4' : 'opacity-0 translate-x-4')
                : 'opacity-100 translate-x-0'
          }`}>
            {displayProducts.map((product, index) => {
              const revenuePercentage = totalRevenue > 0 
                ? (product.total_revenue / totalRevenue) * 100 
                : 0;
              const isPackage = product.item_type === 'package';
              const pid = (product.product_id || '') as string;
              const isOpen = pid && expanded[pid]?.open;

              return (
                <>
                  <tr key={(product.product_id || index) + '-main'} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap w-20">
                      <div className="flex items-center">
                        <span className={`
                          inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                            index === 1 ? 'bg-gray-200 text-gray-700' : 
                            index === 2 ? 'bg-orange-100 text-orange-700' : 
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {product.product_name}
                            </span>
                            {product.item_type && (
                              <span
                                className={
                                  `text-xs px-2 py-0.5 rounded-full border ` +
                                  (product.item_type === 'package'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200')
                                }
                              >
                                {product.item_type === 'package' ? 'Package' : 'Individual'}
                              </span>
                            )}
                            {isPackage ? (
                              <button
                                type="button"
                                aria-label={isOpen ? 'Collapse' : 'Expand'}
                                onClick={async () => {
                                  if (!pid) return;
                                  setExpanded(prev => {
                                    const existing = prev[pid];
                                    if (existing && existing.open) {
                                      return { ...prev, [pid]: { ...existing, open: false } };
                                    }
                                    return { ...prev, [pid]: { open: true, loading: !existing || !existing.items, items: existing?.items || [] } } as any;
                                  });
                                  const existing = expanded[pid];
                                  if (!existing || (existing.items?.length ?? 0) === 0) {
                                    try {
                                      const res = await fetch(`/api/packages/${pid}`);
                                      const json = await res.json();
                                      const items = (json?.data?.items || []).map((it: any) => ({ name: it.product?.name || 'Unknown', quantity: parseFloat(it.quantity || '0') }));
                                      setExpanded(prev => ({ ...prev, [pid]: { open: true, loading: false, items } }));
                                    } catch {
                                      setExpanded(prev => ({ ...prev, [pid]: { open: true, loading: false, items: [] } }));
                                    }
                                  }
                                }}
                                className="ml-1 inline-flex items-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 transition border border-gray-200 hover:border-gray-300"
                              >
                                {isOpen ? <ChevronsUp className="w-4 h-4 transition-transform duration-200" /> : <ChevronsDown className="w-4 h-4 transition-transform duration-200" />}
                              </button>
                            ) : null}
                          </div>
                          {isPackage && (
                            <div
                              className={`transition-all duration-300 ease-out grid ${
                                isOpen ? 'grid-rows-[1fr] opacity-100 translate-y-0 mt-2' : 'grid-rows-[0fr] opacity-0 -translate-y-1 mt-0'
                              }`}
                            >
                              <div className="overflow-hidden">
                                {expanded[pid]?.loading ? (
                                  <div className="text-xs text-gray-500 py-0.5">Loading package items...</div>
                                ) : (
                                  <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                                    {(expanded[pid]?.items || []).map((it, i) => (
                                      <li key={i} className="leading-5">
                                        <span className="text-gray-800">{it.name}</span>
                                        <span className="text-gray-500"> × {formatNumber(it.quantity)}</span>
                                      </li>
                                    ))}
                                    {((expanded[pid]?.items || []).length === 0) && (
                                      <li className="list-none text-gray-500">No items found for this package</li>
                                    )}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(product.total_quantity)}
                      </div>
                    </td>
                    {!hideRevenue && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.total_revenue)}
                        </div>
                      </td>
                    )}
                    {!hideRevenue && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {product.item_type === 'product' ? (
                          product.cost_price === null || product.cost_price === undefined ? (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                              Cost Price not set
                            </span>
                          ) : (
                            <div className="text-sm font-medium text-gray-900">
                              {product.net_income !== null && product.net_income !== undefined
                                ? formatCurrency(product.net_income)
                                : '-'}
                            </div>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {formatNumber(product.order_count)}
                      </div>
                    </td>
                    {!hideRevenue && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12 text-right">
                            {revenuePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                  
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length > limit && (
        <div className="px-6 py-4 bg-gray-50 border-t text-center">
          <p className="text-sm text-gray-600">
            Showing top {limit} of {products.length} products
          </p>
        </div>
      )}
    </div>
  );
}
