'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useLocalOrder } from '@/lib/hooks/useLocalOrder';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { Maximize2, Minimize2, Check } from 'lucide-react';

interface CurrentOrderMonitorProps {
  tableNumber?: string;
  cashierId?: string;
}

/**
 * CurrentOrderMonitor Component
 * 
 * Customer-facing real-time order display with modern, professional UI.
 * Designed with customer-first principles - shows only what customers need.
 * 
 * Features:
 * - Clean, minimal design focused on readability
 * - Fullscreen mode for better visibility
 * - Large fonts and clear visual hierarchy
 * - Real-time updates (<10ms via BroadcastChannel)
 * - Mobile-responsive layout
 * - Smooth animations and transitions
 * 
 * Architecture:
 * - Uses IndexedDB for local storage (no network latency)
 * - Listens to BroadcastChannel for instant updates from POS
 * - Updates in <10ms instead of 200-500ms
 * - Works offline - perfect for local network POS systems
 * 
 * NEW: Supports both dine-in (tableNumber) and takeout (cashierId) orders
 */
export function CurrentOrderMonitor({
  tableNumber,
  cashierId,
}: CurrentOrderMonitorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUpdatePing, setShowUpdatePing] = useState(false);

  // Use local-first order management with auto-sync
  // Filter by table (dine-in) or cashier (takeout)
  const filterOptions = tableNumber 
    ? { tableNumber } 
    : cashierId 
    ? { cashierId } 
    : undefined;
  
  const { order, items, loading, error } = useLocalOrder(filterOptions, true);

  // Show update indicator when items change
  useEffect(() => {
    if (items.length > 0) {
      setShowUpdatePing(true);
      const timer = setTimeout(() => setShowUpdatePing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [items]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  /**
   * Handle fullscreen change events
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-6 text-2xl text-white font-light">Loading your bill...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold text-white mb-4">Connection Issue</h2>
          <p className="text-slate-300 text-lg">{error}</p>
          <p className="text-slate-400 text-sm mt-4">Please refresh or contact staff</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center max-w-lg">
          <div className="text-7xl mb-6 animate-pulse">🍺</div>
          <h2 className="text-4xl font-bold text-white mb-4">
            {tableNumber ? `Welcome to Table ${tableNumber}` : 'Takeout Order'}
          </h2>
          <p className="text-slate-300 text-xl mb-2">
            No active order yet
          </p>
          <p className="text-slate-400 text-lg mt-6">
            Your bill will appear here when you place an order
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-emerald-400">
            <Check className="h-5 w-5" />
            <span className="text-sm">Ready to order</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        {/* Fullscreen Toggle Button */}
        <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 bg-slate-700/50 hover:bg-slate-700 backdrop-blur-sm text-white p-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      {/* Update Indicator */}
      {showUpdatePing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span className="font-medium">Updated</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative h-16 w-16 md:h-20 md:w-20 bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <Image
                src="/beerhive-logo.png"
                alt="BeerHive"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <div className="text-left">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                BeerHive
              </h1>
              <p className="text-slate-400 text-sm md:text-base">Craft Beer & Pub</p>
            </div>
          </div>
          
          {/* Table Number or Takeout Indicator - Large and prominent */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
            {tableNumber ? (
              <>
                <span className="text-slate-400 text-lg">Table</span>
                <span className="text-4xl md:text-5xl font-bold text-white">{tableNumber}</span>
              </>
            ) : (
              <span className="text-3xl md:text-4xl font-bold text-amber-400">🥡 Takeout Order</span>
            )}
          </div>

          {/* Customer Name if available */}
          {order.customerName && (
            <div className="mt-4 text-slate-300 text-lg">
              {order.customerName}
              {order.customerTier && order.customerTier !== 'regular' && (
                <span className="ml-2 text-amber-400 text-sm">
                  ✨ {order.customerTier.replace('vip_', '').replace('_', ' ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Order Items - Clean, Modern List */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">🍺</span>
              <span>Your Order</span>
              <span className="ml-auto text-lg font-normal text-slate-400">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-4 border-b border-white/10 last:border-b-0 group hover:bg-white/5 transition-colors duration-200 rounded-lg px-3 -mx-3"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl md:text-3xl font-bold text-amber-400">
                        {item.quantity}×
                      </span>
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {item.itemName}
                        </h3>
                        {item.notes && (
                          <p className="text-sm text-slate-400 mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Badges for special items */}
                    <div className="flex items-center gap-2 ml-12 md:ml-16">
                      {item.isComplimentary && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                          🎁 Complimentary
                        </span>
                      )}
                      {item.isVipPrice && !item.isComplimentary && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30">
                          ✨ VIP Price
                        </span>
                      )}
                      {item.discountAmount > 0 && !item.isComplimentary && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">
                          💰 Discount
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    {item.discountAmount > 0 && (
                      <div className="text-sm text-slate-500 line-through mb-1">
                        {formatCurrency(item.subtotal)}
                      </div>
                    )}
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Section - Large and Clear */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="space-y-4">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-white/80">
              <span className="text-lg md:text-xl">Subtotal</span>
              <span className="text-2xl md:text-3xl font-semibold">
                {formatCurrency(order.subtotal)}
              </span>
            </div>

            {/* Discount */}
            {order.discountAmount > 0 && (
              <div className="flex justify-between items-center text-white/80">
                <span className="text-lg md:text-xl">Discount</span>
                <span className="text-2xl md:text-3xl font-semibold">
                  -{formatCurrency(order.discountAmount)}
                </span>
              </div>
            )}

            {/* Tax */}
            {order.taxAmount > 0 && (
              <div className="flex justify-between items-center text-white/80">
                <span className="text-lg md:text-xl">Tax</span>
                <span className="text-2xl md:text-3xl font-semibold">
                  {formatCurrency(order.taxAmount)}
                </span>
              </div>
            )}

            {/* Total - Prominent */}
            <div className="pt-4 border-t-2 border-white/30 flex justify-between items-center">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                Total
              </span>
              <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Updates in real-time</span>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            This bill automatically updates when items are added or removed
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 10px;
          transition: background 0.2s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>
    </>
  );
}
