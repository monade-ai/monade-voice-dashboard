'use client';

import { useState, useRef } from 'react';

export default function AccountSettingsPage() {
  const [name, setName] = useState('John Doe');
  const [email] = useState('john.doe@email.com'); // Read-only for now
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [locale, setLocale] = useState('en');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Inline validation
  const isNameValid = name.trim().length > 1;
  const isNewPasswordValid = newPassword.length === 0 || newPassword.length >= 8;
  const isPasswordMatch = newPassword === confirmPassword;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Simulate save
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 1200);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isNewPasswordValid) {
      setError('Password must be at least 8 characters.');

      return;
    }
    if (!isPasswordMatch) {
      setError('Passwords do not match.');

      return;
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-2">
      <form
        onSubmit={handleSave}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6"
        aria-label="Account Settings"
      >
        <h1 className="text-2xl font-bold mb-2 text-center">Account Settings</h1>
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <img
              src={
                avatarUrl ||
                'https://ui-avatars.com/api/?name=' +
                  encodeURIComponent(name) +
                  '&background=F3F4F6&color=374151&size=128'
              }
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition"
              aria-label="Change avatar"
            >
              <span className="text-white text-xs font-semibold">Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="Upload avatar"
            />
          </div>
          <span className="text-sm text-gray-600">{avatar ? avatar.name : 'JPG, PNG, max 2MB'}</span>
        </div>
        {/* Name */}
        <div>
          <label className="block font-medium mb-1" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              isNameValid ? 'focus:ring-blue-500' : 'focus:ring-red-400'
            }`}
            required
            aria-invalid={!isNameValid}
            aria-describedby="name-error"
          />
          {!isNameValid && (
            <span id="name-error" className="text-xs text-red-500">
              Name must be at least 2 characters.
            </span>
          )}
        </div>
        {/* Email (read-only) */}
        <div>
          <label className="block font-medium mb-1" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
            aria-readonly="true"
          />
        </div>
        {/* Notification Preferences */}
        <div className="flex items-center justify-between">
          <label className="font-medium" htmlFor="notifications">
            Email Notifications
          </label>
          <button
            type="button"
            onClick={() => setNotifications((n) => !n)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              notifications ? 'bg-blue-500' : 'bg-gray-300'
            }`}
            aria-pressed={notifications}
            id="notifications"
          >
            <span
              className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                notifications ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
        {/* Language/Locale */}
        <div>
          <label className="block font-medium mb-1" htmlFor="locale">
            Language
          </label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="de">German</option>
            <option value="bn">Bengali</option>
            <option value="et">Estonian</option>
          </select>
        </div>
        {/* Save Button (floating) */}
        <button
          type="submit"
          className={`fixed bottom-8 right-8 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg transition-all duration-200 ${
            saving ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
          disabled={saving || !isNameValid}
          aria-busy={saving}
        >
          {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
        {/* Feedback */}
        {error && (
          <div className="text-red-500 text-sm text-center animate-pulse">{error}</div>
        )}
        {saveSuccess && (
          <div className="text-green-600 text-sm text-center animate-bounce">
            Changes saved!
          </div>
        )}
        {/* Change Password (expandable) */}
        <details className="bg-gray-50 rounded-lg p-4 mt-2">
          <summary className="font-medium cursor-pointer">Change Password</summary>
          <form onSubmit={handleChangePassword} className="space-y-3 mt-3">
            <div>
              <label className="block font-medium mb-1" htmlFor="current-password">
                Current Password
              </label>
              <input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block font-medium mb-1" htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                autoComplete="new-password"
              />
              {newPassword.length > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={`font-semibold ${
                      isNewPasswordValid ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {isNewPasswordValid
                      ? 'Strong password'
                      : 'Password must be at least 8 characters.'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && (
                <div className="text-xs mt-1">
                  <span
                    className={`font-semibold ${
                      isPasswordMatch ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {isPasswordMatch
                      ? 'Passwords match'
                      : 'Passwords do not match.'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword((v) => !v)}
                className="mr-2"
              />
              <label htmlFor="show-password" className="text-sm">
                Show passwords
              </label>
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
              disabled={saving || !isNewPasswordValid || !isPasswordMatch}
            >
              Change Password
            </button>
          </form>
        </details>
        {/* Danger Zone */}
        <details className="bg-red-50 rounded-lg p-4 mt-2">
          <summary className="font-medium text-red-600 cursor-pointer">Danger Zone</summary>
          <div className="flex flex-col gap-2 mt-3">
            <button
              type="button"
              className="text-red-700 font-semibold hover:underline"
              onClick={() => alert('Delete account not implemented')}
            >
              Delete Account
            </button>
          </div>
        </details>
      </form>
    </div>
  );
}
