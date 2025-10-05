/**
 * TableStatusBadge Component
 * Color-coded badge displaying table status
 */

import React from 'react';
import { TableStatus } from '@/models';

interface TableStatusBadgeProps {
  status: TableStatus;
  className?: string;
}

export default function TableStatusBadge({ status, className = '' }: TableStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return {
          label: 'Available',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          dotColor: 'bg-green-500',
        };
      case TableStatus.OCCUPIED:
        return {
          label: 'Occupied',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          dotColor: 'bg-red-500',
        };
      case TableStatus.RESERVED:
        return {
          label: 'Reserved',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          dotColor: 'bg-yellow-500',
        };
      case TableStatus.CLEANING:
        return {
          label: 'Cleaning',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          dotColor: 'bg-gray-500',
        };
      default:
        return {
          label: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          dotColor: 'bg-gray-500',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotColor} mr-1.5`}></span>
      {config.label}
    </span>
  );
}
