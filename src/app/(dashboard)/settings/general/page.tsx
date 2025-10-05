import { Metadata } from 'next';
import GeneralSettingsForm from '@/views/settings/GeneralSettingsForm';

export const metadata: Metadata = {
  title: 'General Settings | BeerHive POS',
  description: 'Configure system-wide settings',
};

export default function GeneralSettingsPage() {
  // TODO: Add admin-only access guard
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-600 mt-1">Configure system-wide settings and preferences</p>
      </div>
      <GeneralSettingsForm />
    </div>
  );
}
