'use client';

import { useState, useEffect } from 'react';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { Save, Building, Receipt, DollarSign, ShoppingCart, CheckCircle } from 'lucide-react';

export default function GeneralSettingsForm() {
  const [settings, setSettings] = useState({
    // Business
    'business.name': '',
    'business.legal_name': '',
    'business.registration_number': '',
    'business.tax_id': '',
    'business.address_line1': '',
    'business.address_line2': '',
    'business.city': '',
    'business.province': '',
    'business.postal_code': '',
    'business.country': 'Philippines',
    'business.phone': '',
    'business.email': '',
    'business.website': '',
    'business.support_contact': '',
    'business.additional_notes': '',

    // Tax
    'tax.enabled': true,
    'tax.rate': 12,
    'tax.inclusive': false,

    // Receipt
    'receipt.footer_message': '',
    'receipt.show_qr': false,
    'receipt.logo_url': '',

    // Order
    'order.auto_print': true,
    'order.kitchen_auto_print': true,
    'order.require_customer': false,

    // Currency
    'currency.code': 'PHP',
    'currency.symbol': '₱',
    'currency.decimal_places': 2,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'tax' | 'receipt' | 'order' | 'currency'>('business');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const result = await response.json();

      if (result.success) {
        const settingsData: any = {};
        
        if (Array.isArray(result.data)) {
          // Data is array of settings objects
          result.data.forEach((setting: any) => {
            settingsData[setting.key] = parseValue(setting.value, setting.data_type);
          });
        } else {
          // Data is already an object
          Object.assign(settingsData, result.data);
        }

        setSettings((prev) => ({ ...prev, ...settingsData }));
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseValue = (value: string, dataType: string): any => {
    switch (dataType) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <TabButton
              active={activeTab === 'business'}
              onClick={() => setActiveTab('business')}
              icon={Building}
              label="Business Info"
            />
            <TabButton
              active={activeTab === 'tax'}
              onClick={() => setActiveTab('tax')}
              icon={DollarSign}
              label="Tax Settings"
            />
            <TabButton
              active={activeTab === 'receipt'}
              onClick={() => setActiveTab('receipt')}
              icon={Receipt}
              label="Receipt"
            />
            <TabButton
              active={activeTab === 'order'}
              onClick={() => setActiveTab('order')}
              icon={ShoppingCart}
              label="Order Settings"
            />
            <TabButton
              active={activeTab === 'currency'}
              onClick={() => setActiveTab('currency')}
              icon={DollarSign}
              label="Currency"
            />
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'business' && (
          <BusinessSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'tax' && (
          <TaxSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'receipt' && (
          <ReceiptSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'order' && (
          <OrderSettings settings={settings} setSettings={setSettings} />
        )}
        {activeTab === 'currency' && (
          <CurrencySettings settings={settings} setSettings={setSettings} />
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 mr-4">
              <CheckCircle className="w-5 h-5" />
              Settings saved successfully!
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors whitespace-nowrap ${
        active
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// Business Settings Section
function BusinessSettings({ settings, setSettings }: any) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
        <p className="text-sm text-gray-500">
          Details saved here automatically flow into printed receipts. Keep this information
          up to date to stay compliant with invoicing requirements.
        </p>
      </div>

      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business.name">Display Name</Label>
            <Input
              id="business.name"
              value={settings['business.name']}
              onChange={(e) => setSettings({ ...settings, 'business.name': e.target.value })}
              placeholder="BeerHive Pub"
            />
          </div>
          <div>
            <Label htmlFor="business.legal_name">Registered / Legal Name</Label>
            <Input
              id="business.legal_name"
              value={settings['business.legal_name']}
              onChange={(e) => setSettings({ ...settings, 'business.legal_name': e.target.value })}
              placeholder="BeerHive Hospitality Inc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business.registration_number">Business Registration No.</Label>
            <Input
              id="business.registration_number"
              value={settings['business.registration_number']}
              onChange={(e) => setSettings({ ...settings, 'business.registration_number': e.target.value })}
              placeholder="SEC / DTI Registration"
            />
          </div>
          <div>
            <Label htmlFor="business.tax_id">Tax ID / TIN</Label>
            <Input
              id="business.tax_id"
              value={settings['business.tax_id']}
              onChange={(e) => setSettings({ ...settings, 'business.tax_id': e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Label htmlFor="business.address_line1">Address</Label>
          <Input
            id="business.address_line1"
            value={settings['business.address_line1']}
            onChange={(e) => setSettings({ ...settings, 'business.address_line1': e.target.value })}
            placeholder="Street, Building, Barangay"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business.address_line2">Address Line 2 (Optional)</Label>
            <Input
              id="business.address_line2"
              value={settings['business.address_line2']}
              onChange={(e) => setSettings({ ...settings, 'business.address_line2': e.target.value })}
              placeholder="Suite / Floor / Landmark"
            />
          </div>
          <div>
            <Label htmlFor="business.city">City / Municipality</Label>
            <Input
              id="business.city"
              value={settings['business.city']}
              onChange={(e) => setSettings({ ...settings, 'business.city': e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="business.province">Province / State</Label>
            <Input
              id="business.province"
              value={settings['business.province']}
              onChange={(e) => setSettings({ ...settings, 'business.province': e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="business.postal_code">Postal Code</Label>
            <Input
              id="business.postal_code"
              value={settings['business.postal_code']}
              onChange={(e) => setSettings({ ...settings, 'business.postal_code': e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="business.country">Country</Label>
            <Input
              id="business.country"
              value={settings['business.country']}
              onChange={(e) => setSettings({ ...settings, 'business.country': e.target.value })}
            />
          </div>
        </div>
      </section>

        <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business.phone">Primary Phone</Label>
            <Input
              id="business.phone"
              value={settings['business.phone']}
              onChange={(e) => setSettings({ ...settings, 'business.phone': e.target.value })}
              placeholder="(+63) 900 000 0000"
            />
          </div>
          <div>
            <Label htmlFor="business.support_contact">Support / Hotline</Label>
            <Input
              id="business.support_contact"
              value={settings['business.support_contact']}
              onChange={(e) => setSettings({ ...settings, 'business.support_contact': e.target.value })}
              placeholder="support@beerhive.ph / (+63) 900 000 0001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="business.email">Email</Label>
            <Input
              id="business.email"
              type="email"
              value={settings['business.email']}
              onChange={(e) => setSettings({ ...settings, 'business.email': e.target.value })}
              placeholder="hello@beerhive.ph"
            />
          </div>
          <div>
            <Label htmlFor="business.website">Website</Label>
            <Input
              id="business.website"
              value={settings['business.website']}
              onChange={(e) => setSettings({ ...settings, 'business.website': e.target.value })}
              placeholder="https://beerhive.ph"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="business.additional_notes">Receipt Notes</Label>
        <textarea
          id="business.additional_notes"
          value={settings['business.additional_notes']}
          onChange={(e) => setSettings({ ...settings, 'business.additional_notes': e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Operating hours, pickup instructions, VAT exemption wording, etc."
        />
      </section>
    </div>
  );
}

// Tax Settings Section
function TaxSettings({ settings, setSettings }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Tax Configuration</h3>

      <div className="flex items-center gap-2">
        <input
          id="tax.enabled"
          type="checkbox"
          checked={settings['tax.enabled']}
          onChange={(e) => setSettings({ ...settings, 'tax.enabled': e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="tax.enabled" className="mb-0">
          Enable tax calculation
        </Label>
      </div>

      {settings['tax.enabled'] && (
        <>
          <div>
            <Label htmlFor="tax.rate">Tax Rate (%)</Label>
            <Input
              id="tax.rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={settings['tax.rate']}
              onChange={(e) => setSettings({ ...settings, 'tax.rate': parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tax.inclusive"
              type="checkbox"
              checked={settings['tax.inclusive']}
              onChange={(e) => setSettings({ ...settings, 'tax.inclusive': e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Label htmlFor="tax.inclusive" className="mb-0">
              Tax inclusive (tax already included in prices)
            </Label>
          </div>
        </>
      )}
    </div>
  );
}

// Receipt Settings Section
function ReceiptSettings({ settings, setSettings }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Receipt Configuration</h3>

      <div>
        <Label htmlFor="receipt.footer_message">Footer Message</Label>
        <textarea
          id="receipt.footer_message"
          value={settings['receipt.footer_message']}
          onChange={(e) => setSettings({ ...settings, 'receipt.footer_message': e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Thank you for your patronage!"
        />
      </div>

      <div>
        <Label htmlFor="receipt.logo_url">Logo URL</Label>
        <Input
          id="receipt.logo_url"
          value={settings['receipt.logo_url']}
          onChange={(e) => setSettings({ ...settings, 'receipt.logo_url': e.target.value })}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="receipt.show_qr"
          type="checkbox"
          checked={settings['receipt.show_qr']}
          onChange={(e) => setSettings({ ...settings, 'receipt.show_qr': e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="receipt.show_qr" className="mb-0">
          Show QR code on receipt
        </Label>
      </div>
    </div>
  );
}

// Order Settings Section
function OrderSettings({ settings, setSettings }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Order Configuration</h3>

      <div className="flex items-center gap-2">
        <input
          id="order.auto_print"
          type="checkbox"
          checked={settings['order.auto_print']}
          onChange={(e) => setSettings({ ...settings, 'order.auto_print': e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="order.auto_print" className="mb-0">
          Auto-print receipt after order completion
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="order.kitchen_auto_print"
          type="checkbox"
          checked={settings['order.kitchen_auto_print']}
          onChange={(e) => setSettings({ ...settings, 'order.kitchen_auto_print': e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="order.kitchen_auto_print" className="mb-0">
          Auto-print kitchen ticket
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="order.require_customer"
          type="checkbox"
          checked={settings['order.require_customer']}
          onChange={(e) => setSettings({ ...settings, 'order.require_customer': e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <Label htmlFor="order.require_customer" className="mb-0">
          Require customer selection for orders
        </Label>
      </div>
    </div>
  );
}

// Currency Settings Section
function CurrencySettings({ settings, setSettings }: any) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Currency Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency.code">Currency Code</Label>
          <Input
            id="currency.code"
            value={settings['currency.code']}
            onChange={(e) => setSettings({ ...settings, 'currency.code': e.target.value.toUpperCase() })}
            placeholder="PHP"
            maxLength={3}
          />
          <div className="text-sm text-gray-500 mt-1">3-letter ISO code (e.g., PHP, USD)</div>
        </div>

        <div>
          <Label htmlFor="currency.symbol">Currency Symbol</Label>
          <Input
            id="currency.symbol"
            value={settings['currency.symbol']}
            onChange={(e) => setSettings({ ...settings, 'currency.symbol': e.target.value })}
            placeholder="₱"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="currency.decimal_places">Decimal Places</Label>
        <Input
          id="currency.decimal_places"
          type="number"
          min="0"
          max="4"
          value={settings['currency.decimal_places']}
          onChange={(e) => setSettings({ ...settings, 'currency.decimal_places': parseInt(e.target.value) || 0 })}
        />
        <div className="text-sm text-gray-500 mt-1">Number of decimal places (0-4)</div>
      </div>
    </div>
  );
}
