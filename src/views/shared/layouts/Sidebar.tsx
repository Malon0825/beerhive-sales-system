'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  ChefHat, 
  Wine, 
  LayoutGrid, 
  Calendar, 
  Clock, 
  BarChart3, 
  Settings,
  Warehouse,
  UserCheck,
  Monitor,
  Beer,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Props for the Sidebar component
 */
interface SidebarProps {
  /** Current user's role for menu filtering */
  userRole?: UserRole;
  /** Visual variant. Desktop renders a static aside, mobile renders a plain container suitable for a drawer. */
  variant?: 'desktop' | 'mobile';
  /** Optional callback invoked when a navigation item is clicked (useful to close mobile drawer). */
  onNavigate?: () => void;
  /** Controls whether the sidebar is collapsed (icons only) or expanded (icons + text). Only applies to desktop variant. */
  isCollapsed?: boolean;
  /** Optional callback invoked when the collapse toggle button is clicked. Only applies to desktop variant. */
  onToggleCollapse?: () => void;
}

/**
 * Menu item structure defining navigation links
 */
interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  roles: UserRole[];
}

/**
 * Navigation menu items with role-based access control
 * Each item specifies which user roles can access the route
 */
const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: '/',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  {
    label: 'Tab',
    icon: <Receipt className="h-5 w-5" />,
    href: '/tabs',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  {
    label: 'POS',
    icon: <ShoppingCart className="h-5 w-5" />,
    href: '/pos',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  {
    label: 'Kitchen',
    icon: <ChefHat className="h-5 w-5" />,
    href: '/kitchen',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.KITCHEN],
  },
  {
    label: 'Bartender',
    icon: <Wine className="h-5 w-5" />,
    href: '/bartender',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.BARTENDER],
  },
  {
    label: 'Waiter',
    icon: <UserCheck className="h-5 w-5" />,
    href: '/waiter',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER],
  },
  {
    label: 'Tables',
    icon: <LayoutGrid className="h-5 w-5" />,
    href: '/tables',
    // Grant waiter access to tables management per role policy update
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER],
  },
  {
    label: 'Current Orders',
    icon: <Clock className="h-5 w-5" />,
    href: '/current-orders',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  {
    label: 'Order Board',
    icon: <Monitor className="h-5 w-5" />,
    href: '/order-board',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN, UserRole.BARTENDER, UserRole.WAITER],
  },
  {
    label: 'Inventory',
    icon: <Warehouse className="h-5 w-5" />,
    href: '/inventory',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    label: 'Customers',
    icon: <Users className="h-5 w-5" />,
    href: '/customers',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
  },
  {
    label: 'Packages',
    icon: <Package className="h-5 w-5" />,
    href: '/packages',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    label: 'Happy Hours',
    icon: <Clock className="h-5 w-5" />,
    href: '/happy-hours',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    label: 'Events',
    icon: <Calendar className="h-5 w-5" />,
    href: '/events',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/reports',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings',
    roles: [UserRole.ADMIN, UserRole.MANAGER],
  },
];
/**
 * Sidebar Component
 * Displays navigation menu with role-based access control
 * Shows logo, menu items filtered by user role, and copyright notice
 * 
 * - Desktop variant renders a static aside visible on `lg+` with collapsible functionality
 * - Mobile variant renders a plain container; parent can wrap it in a drawer/overlay
 * - Collapsed state shows icons only with tooltips for better UX on smaller screens
 *
 * @param {SidebarProps} props - Component props
 */
export function Sidebar({ 
  userRole = UserRole.CASHIER, 
  variant = 'desktop', 
  onNavigate,
  isCollapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const pathname = usePathname();
  const [imageError, setImageError] = useState(false);

  // Filter menu items based on user role permissions
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );
  const handleImageError = () => {
    console.error('Failed to load BeerHive logo from /beerhive-logo.png');
    setImageError(true);
  };

  /**
   * Determine container width based on collapsed state
   * Desktop: w-64 (expanded) or w-16 (collapsed)
   * Mobile: Always w-64
   */
  const containerWidth = variant === 'desktop' 
    ? (isCollapsed ? 'w-16' : 'w-64')
    : 'w-64 max-w-[85vw]';

  /**
   * Choose container element and classes based on variant
   * Desktop variant is hidden on mobile (lg:flex) and includes collapsible width
   */
  const containerClass =
    variant === 'desktop'
      ? `hidden ${containerWidth} flex-col border-r bg-background lg:flex transition-all duration-300 ease-in-out`
      : `${containerWidth} flex h-full flex-col border-r bg-background`;
  const Container: React.ElementType = variant === 'desktop' ? 'aside' : 'div';

  return (
    <Container className={cn(containerClass, 'sidebar')} aria-label="Sidebar">
      {/* Logo and brand section */}
      <div className={cn(
        "flex h-16 items-center justify-center border-b",
        isCollapsed ? "px-2" : "px-6"
      )}>
        <Link href="/" className={cn(
          "flex items-center font-semibold",
          isCollapsed ? "justify-center" : "gap-2"
        )}>
          <div className="relative h-8 w-8 flex items-center justify-center flex-shrink-0">
            {!imageError ? (
              <Image
                src="/beerhive-logo.png"
                alt="BeerHive Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
                onError={handleImageError}
                unoptimized
              />
            ) : (
              // Fallback icon if logo fails to load
              <Beer className="h-8 w-8 text-amber-600" />
            )}
          </div>
          {/* Hide brand text when collapsed */}
          {!isCollapsed && <span className="text-lg whitespace-nowrap">BeerHive POS</span>}
        </Link>
      </div>

      {/* Navigation menu with role-based filtering */}
      <nav 
        className="flex-1 overflow-y-auto py-4 scrollbar-hide" 
        aria-label="Main"
      >
        <ul className={cn(
          "space-y-1",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {filteredMenuItems.map((item) => {
            // Determine if current route is active
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                    isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    // Close the mobile drawer after navigation
                    if (variant === 'mobile') {
                      onNavigate?.();
                    }
                  }}
                >
                  <div className={cn(
                    "flex items-center justify-center",
                    isCollapsed ? "w-full" : ""
                  )}>
                    {item.icon}
                  </div>
                  {/* Hide label text when collapsed */}
                  {!isCollapsed && <span className="flex-1">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle collapse button - only visible on desktop variant */}
      {variant === 'desktop' && onToggleCollapse && (
        <div className={cn(
          "border-t",
          isCollapsed ? "p-2" : "p-3"
        )}>
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center rounded-lg text-sm font-medium transition-colors',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              'w-full',
              isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
      {/* Copyright footer - hide text when collapsed */}
      <div className={cn(
        "border-t",
        isCollapsed ? "p-2 py-3" : "p-4"
      )}>
        <p className={cn(
          "text-xs text-muted-foreground",
          isCollapsed ? "text-center" : "text-center"
        )}>
          {isCollapsed ? '©' : '© 2025 BeerHive POS'}
        </p>
      </div>
    </Container>
  );
}
