'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLocalOrder } from '@/lib/hooks/useLocalOrder';
import { LoadingSpinner } from '@/views/shared/feedback/LoadingSpinner';
import { Check, CheckCircle2, PartyPopper } from 'lucide-react';

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
 * - Large fonts and clear visual hierarchy
 * - Real-time updates (<10ms via BroadcastChannel)
 * - Mobile-responsive layout
 * - Smooth animations and transitions
 * - Item addition animations with slide-in effect
 * - Payment completion celebration animation
 * 
 * Architecture:
 * - Uses IndexedDB for local storage (no network latency)
 * - Listens to BroadcastChannel for instant updates from POS
 * - Updates in <10ms instead of 200-500ms
 * - Works offline - perfect for local network POS systems
 * 
 * Supports both dine-in (tableNumber) and takeout (cashierId) orders
 */
export function CurrentOrderMonitor({
  tableNumber,
  cashierId,
}: CurrentOrderMonitorProps) {
  const [showUpdatePing, setShowUpdatePing] = useState(false);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const previousItemIdsRef = useRef<Set<string>>(new Set());

  // Use local-first order management with auto-sync
  // Filter by table (dine-in) or cashier (takeout)
  const filterOptions = tableNumber 
    ? { tableNumber } 
    : cashierId 
    ? { cashierId } 
    : undefined;
  
  const { order, items, loading, error } = useLocalOrder(filterOptions, true);

  /**
   * Detect new items and apply entrance animations
   * Tracks item IDs to identify which items are newly added
   */
  useEffect(() => {
    if (items.length > 0) {
      const currentItemIds = new Set(items.map(item => item.id));
      const previousItemIds = previousItemIdsRef.current;
      
      // Find newly added items
      const addedItemIds = new Set(
        [...currentItemIds].filter(id => !previousItemIds.has(id))
      );
      
      if (addedItemIds.size > 0) {
        // Mark new items for animation
        setNewItemIds(addedItemIds);
        
        // Show update ping
        setShowUpdatePing(true);
        const pingTimer = setTimeout(() => setShowUpdatePing(false), 2000);
        
        // Remove animation class after animation completes
        const animationTimer = setTimeout(() => {
          setNewItemIds(new Set());
        }, 600); // Match animation duration
        
        // Update ref with current item IDs
        previousItemIdsRef.current = currentItemIds;
        
        return () => {
          clearTimeout(pingTimer);
          clearTimeout(animationTimer);
        };
      }
      
      // Update ref even if no new items
      previousItemIdsRef.current = currentItemIds;
    }
  }, [items]);

  /**
   * Detect payment completion and show success animation
   * When order changes from active to null (payment completed)
   */
  useEffect(() => {
    // If we had an order before but now it's null (payment completed)
    if (!order && previousItemIdsRef.current.size > 0) {
      setShowPaymentSuccess(true);
      
      // Clear the success screen after celebration
      const timer = setTimeout(() => {
        setShowPaymentSuccess(false);
        previousItemIdsRef.current = new Set();
      }, 3500); // Show for 3.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [order]);

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

  /**
   * Payment Success Overlay
   * Shows a celebration screen when payment is completed
   */
  if (showPaymentSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="confetti-particle"></div>
          <div className="confetti-particle" style={{ animationDelay: '0.1s', left: '20%' }}></div>
          <div className="confetti-particle" style={{ animationDelay: '0.2s', left: '40%' }}></div>
          <div className="confetti-particle" style={{ animationDelay: '0.3s', left: '60%' }}></div>
          <div className="confetti-particle" style={{ animationDelay: '0.4s', left: '80%' }}></div>
        </div>

        <div className="text-center z-10 animate-scale-in">
          <div className="mb-6 flex justify-center">
            <CheckCircle2 className="h-32 w-32 text-emerald-400 animate-check-bounce" />
          </div>
          <h2 className="text-6xl font-bold text-white mb-4 animate-slide-up">
            Payment Successful!
          </h2>
          <p className="text-emerald-200 text-2xl mb-8 animate-slide-up animation-delay-100">
            Thank you for your order
          </p>
          <div className="flex items-center justify-center gap-3 text-emerald-300 animate-slide-up animation-delay-200">
            <PartyPopper className="h-6 w-6" />
            <span className="text-lg">Enjoy your meal!</span>
            <PartyPopper className="h-6 w-6" />
          </div>
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
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Update Indicator */}
      {showUpdatePing && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span className="font-medium">Updated</span>
          </div>
        </div>
      )}

      <div className="h-full container mx-auto px-4 py-6 md:py-10 max-w-5xl flex flex-col">
        {/* Header Section - Fixed */}
        <div className="text-center mb-6 flex-shrink-0">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative h-16 w-16 md:h-20 md:w-20 bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <Image
                src="/beerhive-logo.png"
                alt="BeerHive"
                width={80}
                height={80}
                className="object-contain"
                priority
                unoptimized
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

        {/* Order Items - 4x4 Grid with Scroll */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden mb-6 flex-1 flex flex-col min-h-0">
          <div className="p-6 md:p-8 pb-4 flex-shrink-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🍺</span>
              <span>Your Order</span>
              <span className="ml-auto text-lg font-normal text-slate-400">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
          </div>

          {/* 4x4 Grid - Scrollable if more than 16 items */}
          <div className="flex-1 px-6 md:px-8 pb-6 md:pb-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
              {items.map((item, index) => {
                const isNewItem = newItemIds.has(item.id);
                
                return (
                <div
                  key={item.id}
                  className={`
                    bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 
                    hover:bg-white/10 hover:border-amber-500/30 transition-all duration-200
                    flex flex-col justify-between p-4
                    ${isNewItem ? 'animate-item-slide-in ring-2 ring-amber-500/50' : ''}
                  `}
                  style={{ 
                    animationDelay: isNewItem ? '0ms' : `${index * 50}ms` 
                  }}
                >
                  {/* Item Header */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xl font-bold text-amber-400 flex-shrink-0">
                        {item.quantity}×
                      </span>
                      <h3 className="text-base font-semibold text-white flex-1 leading-tight">
                        {item.itemName}
                      </h3>
                    </div>
                    
                    {/* Notes */}
                    {item.notes && (
                      <p className="text-sm text-slate-400 mb-2">
                        {item.notes}
                      </p>
                    )}
                    
                    {/* Badges */}
                    {(item.isComplimentary || item.isVipPrice || item.discountAmount > 0) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.isComplimentary && (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
                            🎁 Complimentary
                          </span>
                        )}
                        {item.isVipPrice && !item.isComplimentary && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
                            ✨ VIP
                          </span>
                        )}
                        {item.discountAmount > 0 && !item.isComplimentary && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                            💰 Discount
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div className="mt-auto pt-2 border-t border-white/10">
                    {item.discountAmount > 0 && (
                      <div className="text-sm text-slate-500 line-through mb-1">
                        {formatCurrency(item.subtotal)}
                      </div>
                    )}
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Total Section - Fixed at Bottom */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-6 md:p-8 shadow-2xl flex-shrink-0">
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

        {/* Footer Message - Fixed at Bottom */}
        <div className="mt-4 text-center flex-shrink-0">
          <div className="inline-flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Updates in real-time</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Item entrance animation - slides in from left with fade */
        @keyframes item-slide-in {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        .animate-item-slide-in {
          animation: item-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        /* Payment success animations */
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .animation-delay-100 {
          animation-delay: 0.1s;
          animation-fill-mode: backwards;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: backwards;
        }
        
        @keyframes check-bounce {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.1);
          }
          50% {
            transform: scale(0.9) rotate(5deg);
          }
          75% {
            transform: scale(1.05) rotate(-5deg);
          }
        }
        
        .animate-check-bounce {
          animation: check-bounce 0.8s ease-in-out;
        }
        
        /* Confetti particles */
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .confetti-particle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          top: -10%;
          left: 10%;
          animation: confetti-fall 3s linear infinite;
        }
        
        .confetti-particle:nth-child(2) {
          background: linear-gradient(45deg, #34d399, #10b981);
          animation-duration: 2.5s;
        }
        
        .confetti-particle:nth-child(3) {
          background: linear-gradient(45deg, #60a5fa, #3b82f6);
          animation-duration: 3.2s;
        }
        
        .confetti-particle:nth-child(4) {
          background: linear-gradient(45deg, #f472b6, #ec4899);
          animation-duration: 2.8s;
        }
        
        .confetti-particle:nth-child(5) {
          background: linear-gradient(45deg, #a78bfa, #8b5cf6);
          animation-duration: 3.5s;
        }
        
        /* Legacy fade-in animation */
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
        
        /* Custom scrollbar */
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
