'use client';

import React from 'react';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { AuthUser } from '@/core/services/auth/AuthService';
import { UserRole } from '@/models/enums/UserRole';

interface HeaderProps {
  user?: AuthUser | null;
  onLogout?: () => void;
  onMenuClick?: () => void;
}

const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return 'destructive';
    case UserRole.MANAGER:
      return 'default';
    case UserRole.CASHIER:
      return 'secondary';
    case UserRole.KITCHEN:
      return 'outline';
    case UserRole.BARTENDER:
      return 'outline';
    default:
      return 'secondary';
  }
};

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return 'Admin';
    case UserRole.MANAGER:
      return 'Manager';
    case UserRole.CASHIER:
      return 'Cashier';
    case UserRole.KITCHEN:
      return 'Kitchen';
    case UserRole.BARTENDER:
      return 'Bartender';
    default:
      return role;
  }
};

export function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title - can be dynamic */}
      <div className="flex-1 lg:flex-initial">
        <h1 className="text-lg font-semibold lg:text-xl">
          {/* This can be dynamically set based on current page */}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <User className="h-4 w-4 text-amber-700" />
              </div>
              <div className="hidden flex-col items-start lg:flex">
                <span className="text-sm font-medium">
                  {user?.full_name || 'User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.username || ''}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.full_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
                {user?.role && (
                  <Badge 
                    variant={getRoleBadgeColor(user.role)} 
                    className="mt-1 w-fit"
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
