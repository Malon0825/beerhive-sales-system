'use client';

import { Metadata } from 'next';
import { Settings, Clock } from 'lucide-react';
import { Card } from '@/views/shared/ui/card';

export default function GeneralSettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
      </div>
      
      {/* Coming Soon Message */}
      <Card className="p-12">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
          <p className="text-gray-600 mb-4">
            General settings configuration is currently under development. This feature will allow you to:
          </p>
          <ul className="text-left text-gray-600 space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Configure business information and branding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Set tax rates and currency preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Manage system-wide default settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Configure notification preferences</span>
            </li>
          </ul>
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Feature in development</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
