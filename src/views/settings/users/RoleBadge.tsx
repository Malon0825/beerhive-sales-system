'use client';

import { Badge } from '../../shared/ui/badge';
import { Shield, UserCog, DollarSign, ChefHat, Wine } from 'lucide-react';

interface RoleBadgeProps {
  role: string;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const getRoleConfig = () => {
    switch (role.toLowerCase()) {
      case 'admin':
        return {
          label: 'Admin',
          variant: 'destructive' as const,
          icon: Shield,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
        };
      case 'manager':
        return {
          label: 'Manager',
          variant: 'default' as const,
          icon: UserCog,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
        };
      case 'cashier':
        return {
          label: 'Cashier',
          variant: 'success' as const,
          icon: DollarSign,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
        };
      case 'kitchen':
        return {
          label: 'Kitchen',
          variant: 'secondary' as const,
          icon: ChefHat,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
        };
      case 'bartender':
        return {
          label: 'Bartender',
          variant: 'secondary' as const,
          icon: Wine,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
        };
      default:
        return {
          label: role,
          variant: 'secondary' as const,
          icon: Shield,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
