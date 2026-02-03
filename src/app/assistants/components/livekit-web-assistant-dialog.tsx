// components/livekit-web-assistant-dialog.tsx
'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLiveKitWebAssistant } from '@/app/hooks/use-livekit-web-assistant';

import { AgentStarterEmbed } from './agent-starter-embed';

interface CalleeInfo {
  [key: string]: string;
}

interface LiveKitWebAssistantDialogProps {
  assistantName: string;
  assistantId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveKitWebAssistantDialog({
  assistantName,
  assistantId,
  isOpen,
  onClose,
}: LiveKitWebAssistantDialogProps) {
  const [calleeInfo, setCalleeInfo] = useState<CalleeInfo>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<{
    serverUrl: string;
    roomName: string;
    participantToken: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state to prevent multi-clicking
  const [submitError, setSubmitError] = useState<string | null>(null); // New state for submission errors
  
  const {
    endSession,
    error: connectionError,
    errorMessage,
  } = useLiveKitWebAssistant({
    assistantId,
    assistantName,
  });

  const addCalleeInfoField = () => {
    if (newKey.trim() && newValue.trim()) {
      setCalleeInfo(prev => ({
        ...prev,
        [newKey.trim()]: newValue.trim(),
      }));
      setNewKey('');
      setNewValue('');
    }
  };

  const removeCalleeInfoField = (key: string) => {
    const updatedInfo = { ...calleeInfo };
    delete updatedInfo[key];
    setCalleeInfo(updatedInfo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LiveKitWebAssistantDialog] Form submitted with calleeInfo:', calleeInfo);
    
    // Clear any previous errors
    setSubmitError(null);
    
    // Prevent multi-clicking
    if (isSubmitting) {
      console.log('[LiveKitWebAssistantDialog] Form submission already in progress, ignoring click');

      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate a unique room name once
      const roomName = `assistant-${assistantId}-${Date.now()}`;
      
      // First create the dispatch using the same room name
      const dispatchResponse = await fetch('/api/livekit-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          agentName: assistantName,
          calleeInfo,
          assistantId,
        }),
      });

      if (!dispatchResponse.ok) {
        const errorData = await dispatchResponse.json();
        const errorMessage = errorData.error || 'Failed to create LiveKit dispatch';
        throw new Error(errorMessage);
      }

      const dispatchData = await dispatchResponse.json();
      console.log('[LiveKitWebAssistantDialog] LiveKit dispatch created successfully:', dispatchData);
      
      setIsSessionStarted(true);
      
      // Now fetch connection details for the agent starter embed using the same room name
      const response = await fetch('/api/agent-connection-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName,
          agentName: assistantName,
          calleeInfo,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connection details');
      }

      const data = await response.json();
      setConnectionDetails({
        serverUrl: data.serverUrl,
        roomName: data.roomName,
        participantToken: data.participantToken,
      });
      
    } catch (err) {
      console.error('[LiveKitWebAssistantDialog] Error starting session:', err);
      setIsSessionStarted(false);
      // Reset submitting state on error so user can try again
      setIsSubmitting(false);
      
      // Set user-friendly error message
      if (err instanceof Error) {
        setSubmitError(err.message);
        console.error('[LiveKitWebAssistantDialog] Session error:', err.message);
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleEndSession = () => {
    endSession();
    setIsSessionStarted(false);
    setConnectionDetails(null);
    // Reset submitting state when ending session
    setIsSubmitting(false);
    // Clear any submit errors when ending session
    setSubmitError(null);
  };

  const renderDialogContent = () => {
    // Show loading state while submitting
    if (isSubmitting && !isSessionStarted) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
          <h3 className="text-lg font-medium mb-2">Setting up your session</h3>
          <p className="text-sm text-gray-500 text-center">
            Initializing voice agent and establishing connection...
          </p>
        </div>
      );
    }
    
    // Show error state if there was a submission error
    if (submitError) {
      return (
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="bg-red-100 rounded-full p-3 mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connection Failed</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              {submitError}
            </p>
          </div>
          
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => {
              setSubmitError(null);
              // Form will be shown again with the retry option
            }}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    
    // If session is started and we have connection details, show the agent starter embed
    if (isSessionStarted && connectionDetails) {
      return (
        <AgentStarterEmbed
          roomName={connectionDetails.roomName}
          agentName={assistantName}
          serverUrl={connectionDetails.serverUrl}
          participantToken={connectionDetails.participantToken}
          isOpen={true}
          onClose={handleEndSession}
          onDisconnect={handleEndSession}
          onError={(error) => {
            console.error('[LiveKitWebAssistantDialog] Agent starter embed error:', error);
            // We could handle this error in various ways:
            // 1. Show an error message to the user
            // 2. Automatically end the session and return to the form
            // 3. Allow the user to retry
            
            // For now, we'll end the session and show an error
            setSubmitError(error.message || 'Failed to connect to the voice agent. Please try again.');
            handleEndSession();
          }}
        />
      );
    }

    // Show connecting state after session is started but before we have connection details
    if (isSessionStarted) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
          <h3 className="text-lg font-medium mb-2">Connecting to agent</h3>
          <p className="text-sm text-gray-500 text-center">
            Please wait while we connect you to {assistantName}...
          </p>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">
              User Information (Optional)
          </label>
          <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md">
            {Object.entries(calleeInfo).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div>
                  <span className="font-medium">{key}:</span> {value}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCalleeInfoField(key)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {Object.keys(calleeInfo).length === 0 && (
              <p className="text-sm text-gray-500 italic">No additional information added</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              type="text"
              placeholder="Field name (e.g., name)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Input
              type="text"
              placeholder="Value (e.g., John Doe)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <Button
              type="button"
              variant="outline"
              onClick={addCalleeInfoField}
              disabled={!newKey.trim() || !newValue.trim()}
              className="w-full"
            >
              Add
            </Button>
          </div>
        </div>
          
        <p className="text-xs text-slate-500">
          You&apos;ll be connected to {assistantName} in a LiveKit session.
        </p>
          
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 h-4 w-4 inline-block border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Starting Session...
              </>
            ) : (
              'Start Session'
            )}
          </Button>
        </DialogFooter>
        
        {connectionError && (
          <p className="text-sm text-red-500">Error: {errorMessage}</p>
        )}
      </form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (isSessionStarted) {
          handleEndSession();
        }
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-amber-500" />
            {assistantName} - LiveKit Session
          </DialogTitle>
        </DialogHeader>
        
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}
