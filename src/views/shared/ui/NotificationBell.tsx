'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  X,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  GlassWater,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import type { Notification } from '@/models/entities/Notification';
import { NotificationType, NotificationPriority } from '@/models/enums/NotificationType';
import { cn } from '@/lib/utils/cn';

/**
 * Get icon for notification type
 */
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ORDER_CREATED:
    case NotificationType.ORDER_COMPLETED:
    case NotificationType.ORDER_VOIDED:
      return ShoppingCart;
    case NotificationType.FOOD_READY:
    case NotificationType.FOOD_DELIVERED:
      return UtensilsCrossed;
    case NotificationType.BEVERAGE_READY:
    case NotificationType.BEVERAGE_DELIVERED:
      return GlassWater;
    case NotificationType.LOW_STOCK:
    case NotificationType.OUT_OF_STOCK:
    case NotificationType.REORDER_POINT:
      return Package;
    default:
      return Bell;
  }
};

/**
 * Get color for notification priority
 */
const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case NotificationPriority.URGENT:
      return 'text-red-600 bg-red-50';
    case NotificationPriority.HIGH:
      return 'text-orange-600 bg-orange-50';
    case NotificationPriority.NORMAL:
      return 'text-blue-600 bg-blue-50';
    case NotificationPriority.LOW:
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-blue-600 bg-blue-50';
  }
};

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const notifDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notifDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return notifDate.toLocaleDateString();
};

/**
 * NotificationItem Component
 */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors',
        !notification.is_read && 'bg-blue-50/30'
      )}
    >
      {/* Icon */}
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', priorityColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 leading-tight">
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
          )}
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-2">
          {notification.message}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(notification.created_at)}
          </span>
          
          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onMarkAsRead(notification.id)}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:text-red-600"
              onClick={() => onDelete(notification.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationBell Component
 * Displays notification bell with dropdown panel
 */
export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isMuted,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    toggleMute,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isMuted ? (
            <BellOff className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          
          {/* Subtle ping animation for new notifications */}
          {unreadCount > 0 && !isMuted && (
            <span className="absolute right-1 top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          
          <div className="flex gap-1">
            {/* Mute toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={toggleMute}
              title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
            >
              {isMuted ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </Button>
            
            {/* Mark all as read */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No notifications</p>
              <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
