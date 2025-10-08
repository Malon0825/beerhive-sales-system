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
  Receipt
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
    label: 'Tab Management',
    icon: <Receipt className="h-5 w-5" />,
    href: '/tabs',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
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
 *Shows logo, menu items filtered by user role, and copyright notice
 * 
 * - Desktop variant renders a static aside visible on `lg+`
 * - Mobile variant renders a plain container; parent can wrap it in a drawer/overlay
 *
 * @param {SidebarProps} props - Component props
 */
export function Sidebar({ userRole = UserRole.CASHIER, variant = 'desktop', onNavigate }: SidebarProps) {
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

  // Choose container element and classes based on variant
  const containerClass =
    variant === 'desktop'
      ? 'hidden w-64 flex-col border-r bg-background lg:flex'
      : 'w-64 max-w-[85vw] flex h-full flex-col border-r bg-background';
  const Container: React.ElementType = variant === 'desktop' ? 'aside' : 'div';

  return (
    <Container className={cn(containerClass, 'sidebar')} aria-label="Sidebar">
      {/* Logo and brand section */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="relative h-8 w-8 flex items-center justify-center">
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
          <span className="text-lg">BeerHive POS</span>
        </Link>
      </div>

      {/* Navigation menu with role-based filtering */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main">
        <ul className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            // Determine if current route is active
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                    isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    // Close the mobile drawer after navigation
                    if (variant === 'mobile') {
                      onNavigate?.();
                    }
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          © 2025 BeerHive POS
        </p>
      </div>
    </Container>
  );
}
