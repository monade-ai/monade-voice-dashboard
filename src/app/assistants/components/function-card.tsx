'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/knowledge-base/hooks/use-toast';
import { createGmailSupabaseClient } from '@/utils/supabase/gmail-supabase-client';

interface FunctionCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  userEmail?: string; // Make email optional
  gmail?: {
    from?: string;
    to_email?: string;
    subject?: string;
    body?: string;
    agent_email?: boolean;
    personalisation?: boolean;
  };
  onGmailChange?: (gmail: {
    from?: string;
    to_email?: string;
    subject?: string;
    body?: string;
    agent_email?: boolean;
    personalisation?: boolean;
  }) => void;
  saveAssistantUpdates?: (id: string, data: any) => Promise<any>;
  currentAssistantId?: string;
}

export default function FunctionCard({
  icon,
  name,
  description,
  userEmail,
  gmail,
  onGmailChange,
  saveAssistantUpdates,
  currentAssistantId,
}: FunctionCardProps) {
  const [isEnabled, setIsEnabled] = useState(!!userEmail);
  const [showConfig, setShowConfig] = useState(false);
  const [fromEmail, setFromEmail] = useState(gmail?.from || '');
  const [subject, setSubject] = useState(gmail?.subject || '');
  const [body, setBody] = useState(gmail?.body || '');
  const [agentEmailEnabled, setAgentEmailEnabled] = useState(gmail?.agent_email || false);
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    if (!userEmail) {
      // Here you would trigger the Google OAuth flow
      console.log(`Redirecting to Google OAuth for ${name}...`);
      // In a real app, you'd redirect or open a popup.
      // For this example, we'll simulate a successful login.
      // setUserEmail('user@example.com'); // This would be set by your auth context
      setIsEnabled(true);
    } else {
      setIsEnabled(checked);
    }
    setShowConfig(checked);
  };

  const handleSignIn = async () => {
    console.log('Signing in with email:', fromEmail);
    const supabase = createGmailSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('client_id')
        .eq('client_email', fromEmail)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({ title: 'Error', description: 'Email not found.' });
        } else {
          throw error;
        }
      }

      if (data) {
        const authUrl = `${process.env.NEXT_PUBLIC_GMAIL_AUTH_URL}/login?id=${data.client_id}`;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Error fetching client_id:', error);
      toast({ title: 'Error', description: 'Failed to get client ID.' });
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-gray-300">
      <div className="flex items-center space-x-6 p-6">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>

        {/* Action Control */}
        <div className="flex items-center">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            aria-label={`Enable or disable ${name} integration`}
          />
        </div>
      </div>

      {/* User Status and Configuration */}
      <div className="border-t border-gray-200/80 bg-gray-50/50 px-6 py-3">
        <div className="flex items-center justify-between">
          {userEmail ? (
            <Badge variant="outline" className="flex items-center space-x-2 border-green-300 bg-green-50 text-green-800">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span>{userEmail}</span>
            </Badge>
          ) : name === 'Gmail' ? (
            <div className="flex items-center space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
              {/* Gmail Save Button */}
              <Button
                onClick={async () => {
                  try {
                    if (currentAssistantId) {
                      await saveAssistantUpdates?.(currentAssistantId, { ...gmail, from: fromEmail  });
                      toast({ title: 'Success', description: 'Email saved.' });
                    }
                  } catch (error) {
                    toast({ title: 'Error', description: 'Failed to save email.' });
                  }
                }}
                disabled={!fromEmail}
              >
                Save
              </Button>
              <Badge
                variant="destructive"
                className={`cursor-pointer flex items-center space-x-2 border-red-300 bg-red-50 text-red-800 ${!fromEmail && 'opacity-50 cursor-not-allowed'}`}
                onClick={fromEmail ? handleSignIn : undefined}
              >
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                <span>Sign in with Google</span>
              </Badge>
            </div>
          ) : null}
        </div>
      </div>

      {/* Collapsible Configuration Section */}
      {isEnabled && showConfig && (
        <div className="border-t border-gray-200/80 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="agent-email-toggle" className="text-sm font-medium text-gray-700">
                Agent Email
              </label>
              <Switch
                id="agent-email-toggle"
                checked={agentEmailEnabled}
                onCheckedChange={async (checked) => {
                  setAgentEmailEnabled(checked);
                  onGmailChange?.({ ...gmail, agent_email: checked, personalisation: checked });
                  if (currentAssistantId) {
                    try {
                      await saveAssistantUpdates?.(currentAssistantId, {
                        ...gmail,
                        agent_email: checked,
                        personalisation: checked,
                      });
                      toast({
                        title: 'Success',
                        description: 'Personalisation settings saved.',
                      });
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to save settings.',
                      });
                      setAgentEmailEnabled(!checked);
                      onGmailChange?.({ ...gmail, agent_email: !checked, personalisation: !checked });
                    }
                  }
                }}
              />
            </div>

            {agentEmailEnabled ? (
              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
                <p>AI agent will send personalized email based on each call.</p>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    placeholder="e.g., Test Email from Assistant"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      onGmailChange?.({ ...gmail, subject: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                    Email Body
                  </label>
                  <textarea
                    id="body"
                    rows={5}
                    placeholder="e.g., This is a test email sent via the assistant."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      onGmailChange?.({ ...gmail, body: e.target.value });
                    }}
                  />
                </div>
                {/* Subject and Body Save Button */}
                <Button
                  onClick={async () => {
                    try {
                      if (currentAssistantId) {
                        await saveAssistantUpdates?.(currentAssistantId, {
                          ...gmail,
                          emailSubject: subject,
                          emailBody: body,
                        });
                        toast({
                          title: 'Success',
                          description: 'Subject and body saved.',
                        });
                      }
                    } catch (error) {
                      toast({
                        title: 'Error',
                        description: 'Failed to save subject and body.',
                      });
                    }
                  }}
                  disabled={!subject && !body}
                >
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
