'use client';

import React from 'react';
import Link from 'next/link';
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
  Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { UserRole } from '@/models/enums/UserRole';

interface SidebarProps {
  userRole?: UserRole;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  roles: UserRole[];
}

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
    label: 'Tables',
    icon: <LayoutGrid className="h-5 w-5" />,
    href: '/tables',
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
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

export function Sidebar({ userRole = UserRole.CASHIER }: SidebarProps) {
  const pathname = usePathname();

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wine className="h-6 w-6 text-amber-600" />
          <span className="text-lg">BeerHive POS</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
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
    </aside>
  );
}
