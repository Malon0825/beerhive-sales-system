'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { AlertCircle, AlertTriangle, CheckCircle, XCircle, Info, PackageX } from 'lucide-react';

interface AlertDialogSimpleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  details?: string[];
  variant?: 'error' | 'warning' | 'success' | 'info' | 'stock-error';
  onClose?: () => void;
}

/**
 * AlertDialogSimple Component
 * Simple alert dialog for displaying messages to users (no confirmation needed)
 * Perfect for error messages, warnings, and informational alerts
 */
export function AlertDialogSimple({
  open,
  onOpenChange,
  title,
  description,
  details,
  variant = 'info',
  onClose,
}: AlertDialogSimpleProps) {
  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'stock-error':
        return <PackageX className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'error':
      case 'stock-error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-blue-50';
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'error':
      case 'stock-error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${getBackgroundColor()} flex-shrink-0`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-left">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-left whitespace-pre-wrap">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Details List (for stock issues) */}
        {details && details.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">Stock Details:</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {details.map((detail, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button
            variant={getButtonVariant()}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            OK, Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
