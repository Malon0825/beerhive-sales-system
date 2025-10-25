'use client';

import GeneralSettingsForm from '@/views/settings/GeneralSettingsForm';

export default function GeneralSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure business identity, tax rules, receipts, and ordering preferences.
        </p>
      </header>

      <GeneralSettingsForm />
    </div>
  );
}
