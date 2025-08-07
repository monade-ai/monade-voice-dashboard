'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('complete_onboarding', { org_name: orgName });
      if (error) throw error;
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Welcome! Let's get you started.</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="orgName">Organization Name</label>
        <input
          id="orgName"
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Organization'}
        </button>
        {error && <p>{error}</p>}
      </form>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <span>or</span>
        <br />
        <a
          href="/auth/join"
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '8px 16px',
            background: '#f3f4f6',
            borderRadius: 4,
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: 500,
            border: '1px solid #e5e7eb',
          }}
        >
          Join an Organization
        </a>
      </div>
    </div>
  );
}
