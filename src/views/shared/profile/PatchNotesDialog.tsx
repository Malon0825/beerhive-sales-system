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
 * Displays version 1.0.2 patch notes in user-friendly language
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
              <DialogTitle className="text-2xl">What's New in Version 1.0.2</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Released: October 20, 2025</p>
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
                {/* Cancelled Orders Fix */}
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Kitchen & Bar Staff Can Now See Cancelled Items
                      </h3>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>The Problem:</strong> When customers removed items from their orders, 
                        the kitchen and bar staff couldn't see these cancellations. This led to 
                        wasted food and drinks being prepared for nothing.
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>How We Fixed It:</strong> Cancelled items now stay on the screen 
                        with a red "CANCELLED" label, so staff can immediately stop preparing them.
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
                {/* Clear Cancelled Orders */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Clean Up Cancelled Orders</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Keep your kitchen and bar screens tidy with new cleanup options.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>"Clear All" button removes all cancelled orders at once</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Individual "Remove" button on each cancelled item</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Cancelled items stay visible until you manually remove them</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Category Management */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <FolderEdit className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Manage Product Categories</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Full control over your product categories with smart safety features.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Create new categories with custom colors</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Edit existing categories (name, color, settings)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Delete unused categories safely</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Prevents duplicate names (Beer = beer = BEER)</span>
                        </li>
                      </ul>
                      <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-800">
                            <strong>Safety First:</strong> You cannot delete a category if products 
                            are still using it. The system will show you which products need to be 
                            reassigned first.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Layout className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Customize Product Display Layout</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Choose how many product columns you want to see on your screen.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Pick from 3, 4, 5, or 6 columns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Your preference saves automatically during your session</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Smooth animations when switching layouts</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Reports & Analytics (All Products Sold) */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Reports & Analytics: All Products Sold</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Improved clarity and export alignment when analyzing sold products.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Standalone vs Combined toggle (revenue shown only in Standalone)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Directional slide on toggle; header stays fixed while body animates</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Inline package details with smooth expand/collapse</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Sticky table header and fixed Rank column for consistent layout</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Export All reflects toggle; removed Top Products sheet; Combined export excludes revenue</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Table Management */}
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Table2 className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Complete Table Management</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Full control over your restaurant tables and seating areas.
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Edit table details (number, capacity, area, notes)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Create custom area names (like "Rooftop Bar" or "Garden")</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Prevents duplicate area names</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Tables page now focused only on table management</span>
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
                  <h4 className="font-semibold text-amber-900 mb-2">For Kitchen & Bar Staff:</h4>
                  <ol className="space-y-2 text-sm text-amber-900">
                    <li className="flex gap-2">
                      <span className="font-semibold">1.</span>
                      <span>When you see a red "CANCELLED" label on an item, stop preparing it immediately</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Click the "Remove" button to clear it from your screen</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Use "Clear Cancelled" button to remove all cancelled items at once</span>
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">For Managers:</h4>
                  <ol className="space-y-2 text-sm text-amber-900">
                    <li className="flex gap-2">
                      <span className="font-semibold">1.</span>
                      <span>Find category management in the "Add Product" dialog</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Edit tables by clicking the pencil icon on any table card</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>Customize your product grid layout using the dot selector</span>
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
