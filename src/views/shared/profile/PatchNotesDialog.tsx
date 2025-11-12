'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  CheckCircle2, 
  Sparkles, 
  Wrench, 
  Calendar,
  AlertCircle,
  XCircle,
  Trash2,
  Layout,
  FolderEdit,
  Table2,
  BarChart3,
} from 'lucide-react';

interface PatchNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * PatchNotesDialog Component
 * Displays version 1.1.0 patch notes in user-friendly language
 * Designed for non-technical users to understand what's new and what was fixed
 */
export function PatchNotesDialog({ open, onOpenChange }: PatchNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <DialogTitle className="text-2xl">What's New in Version 1.1.0</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Released: November 13, 2025</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-120px)] pr-4">
          <div className="space-y-6">
            {/* What's Fixed Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Problems We Fixed</h2>
              </div>

              <div className="space-y-4">
                {/* Tab Discount Reporting Fix */}
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Tab Discounts Now Show in Reports
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>The Problem:</strong> Discounts applied when closing tabs weren't 
                        being recorded properly, causing inaccurate sales reports and missing discount data.
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>How We Fixed It:</strong> All tab discounts are now properly saved 
                        to the database and appear correctly in sales and discount reports.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Numeric Input Scroll Fix */}
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Accidental Number Changes While Scrolling
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>The Problem:</strong> Scrolling with your mouse over number fields 
                        accidentally changed quantities and prices, leading to order mistakes.
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>How We Fixed It:</strong> Mouse wheel scrolling over number fields 
                        no longer changes values. Numbers only change when you type them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* What's New Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-semibold">New Features</h2>
              </div>

              <div className="space-y-4">
                {/* POS Discounts */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Apply Discounts at Checkout</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Give customers discounts directly in the POS system before payment.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Percentage discounts (10%, 20%, etc.) or fixed amount discounts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Add optional reason for the discount (senior, promo, etc.)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>All discounts tracked in reports for accounting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Works for both direct POS sales and tab closures</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Order Item Notes */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Add Special Instructions to Orders</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add notes for individual items so the kitchen knows exactly how to prepare them.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Add notes like "no onions", "extra spicy", or "well done"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Notes appear on kitchen tickets and receipts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Works for both POS and tab orders</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Alphabetical Product Sorting */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Layout className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Products Sorted Alphabetically</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        All products in POS now appear in A-Z order, making them easier to find.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Products sorted alphabetically by name</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Faster to find products when taking orders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Applies to all POS screens and tab module</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Package Dialog Improvements */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <FolderEdit className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Improved Package Management</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Better controls for creating and managing product packages.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Cleaner package editing interface</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Better validation for package pricing and items</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Easier to add and remove items from packages</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How to Use Section */}
            <section className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold">Quick Guide for Staff</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">For Cashiers:</h4>
                  <ol className="space-y-2 text-sm text-amber-900">
                    <li className="flex gap-2">
                      <span className="font-semibold">1.</span>
                      <span>Use the "Discount" button during checkout to apply discounts</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Products are now sorted alphabetically - easier to find items quickly</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Add special instructions by clicking the note icon on any order item</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">For Managers:</h4>
                  <ol className="space-y-2 text-sm text-amber-900">
                    <li className="flex gap-2">
                      <span className="font-semibold">1.</span>
                      <span>All discounts (POS and tabs) now tracked correctly in reports</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Number fields won't change accidentally when scrolling anymore</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Package management interface is cleaner and easier to use</span>
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Important Notes */}
            <section className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Good News!</h3>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• Everything you're already familiar with works exactly the same</li>
                    <li>• No need to learn new workflows for existing features</li>
                    <li>• All your data is safe and secure</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Support */}
            <section className="text-center p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                Questions about these updates? Contact your manager or system administrator.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
