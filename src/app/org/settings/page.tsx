'use client';

import { useState, useRef } from 'react';

const TABS = ['Profile', 'Users', 'Billing', 'Danger Zone'] as const;
type Tab = typeof TABS[number];

export default function OrgSettingsPage() {
  const [tab, setTab] = useState<Tab>('Profile');
  const [orgName, setOrgName] = useState('Acme Corporation');
  const [industry, setIndustry] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
      setLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-2">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Organization Settings</h1>
        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                tab === t
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-current={tab === t}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {tab === 'Profile' && (
          <form onSubmit={handleSave} className="flex flex-col gap-6" aria-label="Org Profile">
            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative group">
                <img
                  src={
                    logoUrl ||
                    'https://ui-avatars.com/api/?name=' +
                      encodeURIComponent(orgName) +
                      '&background=F3F4F6&color=374151&size=128'
                  }
                  alt="Org Logo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition"
                  aria-label="Change logo"
                >
                  <span className="text-white text-xs font-semibold">Change</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  aria-label="Upload logo"
                />
              </div>
              <span className="text-sm text-gray-600">{logo ? logo.name : 'JPG, PNG, max 2MB'}</span>
            </div>
            {/* Org Name */}
            <div>
              <label className="block font-medium mb-1" htmlFor="org-name">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {/* Industry */}
            <div>
              <label className="block font-medium mb-1" htmlFor="industry">
                Industry
              </label>
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Technology, Healthcare"
              />
            </div>
            {/* Contact Email */}
            <div>
              <label className="block font-medium mb-1" htmlFor="contact-email">
                Contact Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="contact@acme.com"
              />
            </div>
            {/* Save Button */}
            <button
              type="submit"
              className={`fixed bottom-8 right-8 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-200 ${
                saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
            {/* Feedback */}
            {saveSuccess && (
              <div className="text-green-600 text-sm text-center animate-bounce">
                Changes saved!
              </div>
            )}
          </form>
        )}
        {tab === 'Users' && (
          <div className="flex flex-col gap-6" aria-label="Org Users">
            <div className="text-center text-gray-500 py-8">
              <span className="text-lg">User management features coming soon.</span>
            </div>
            {/* Example: Invite User Button */}
            <button
              type="button"
              className="mx-auto bg-blue-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-600 transition"
              disabled
            >
              Invite User
            </button>
          </div>
        )}
        {tab === 'Billing' && (
          <div className="flex flex-col gap-6" aria-label="Org Billing">
            <div className="text-center text-gray-500 py-8">
              <span className="text-lg">Billing features coming soon.</span>
            </div>
            {/* Example: Upgrade Plan Button */}
            <button
              type="button"
              className="mx-auto bg-green-500 text-white px-6 py-2 rounded-full font-semibold hover:bg-green-600 transition"
              disabled
            >
              Upgrade Plan
            </button>
          </div>
        )}
        {tab === 'Danger Zone' && (
          <div className="flex flex-col gap-6" aria-label="Org Danger Zone">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center gap-4">
              <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
              <button
                type="button"
                className="text-red-700 font-semibold hover:underline"
                onClick={() => alert('Delete org not implemented')}
              >
                Delete Organization
              </button>
              <button
                type="button"
                className="text-red-700 font-semibold hover:underline"
                onClick={() => alert('Transfer ownership not implemented')}
              >
                Transfer Ownership
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
