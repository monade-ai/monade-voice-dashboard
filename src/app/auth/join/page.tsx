'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AiOutlineExclamationCircle } from 'react-icons/ai';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function JoinOrganizationPage() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate invite code by calling the backend (reuse invitation logic)
      const { data, error: fetchError } = await supabase
        .from('invitation_tokens')
        .select('token')
        .eq('token', inviteCode)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      if (fetchError || !data) {
        setError('Invalid or expired invite code.');
        setLoading(false);

        return;
      }

      // Redirect to the invitation acceptance page with the token
      router.push(`/auth/invite?token=${inviteCode}`);
    } catch (err: any) {
      setError('Failed to join organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join an Organization</CardTitle>
          <CardDescription>
            Enter your invite code to join an existing organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              required
              disabled={loading}
            />
            {error && (
              <div className="flex items-center text-sm text-destructive">
                <AiOutlineExclamationCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Checking...' : 'Join Organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
