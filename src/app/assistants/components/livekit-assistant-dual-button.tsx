// components/livekit-assistant-dual-button.tsx
'use client';

import { useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNewPhoneAssistant } from '@/app/hooks/use-new-phone-assistant';
import { useLiveKitWebAssistant } from '@/app/hooks/use-livekit-web-assistant';
import { useMonadeUser } from '@/app/hooks/use-monade-user';

import { useAssistants } from '../../hooks/use-assistants-context';
import { NewPhoneDialog } from '../components/new-phone-dialog';
import { LiveKitWebAssistantDialog } from '../components/livekit-web-assistant-dialog';

interface AssistantDualButtonProps {
  assistant: Assistant | string;
}

interface Assistant {
  id: string;
  phoneNumber?: string;
  name: string;
}

export default function LiveKitAssistantDualButton({ assistant }: AssistantDualButtonProps) {
  const [mode, setMode] = useState<'chat' | 'talk'>('chat');
  const { assistants } = useAssistants();
  const { apiKey } = useMonadeUser();

  // Get assistant data if string ID was passed
  const assistantData = typeof assistant === 'string'
    ? assistants.find(a => a.id === assistant) || { id: assistant, name: 'Unknown Assistant' }
    : assistant;

  // Dialog states
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  const [isWebDialogOpen, setIsWebDialogOpen] = useState(false);

  // Use new phone assistant hook with API key
  const {
    isCallInProgress,
    isCallInitiating,
    callStatus,
    remainingTime,
    startCall,
    endCall,
    error: callError,
    errorMessage,
  } = useNewPhoneAssistant({
    assistantId: assistantData.id,
    assistantName: assistantData.name,
    apiKey: apiKey, // Pass user's API key for billing
  });

  // Use LiveKit web assistant hook
  const {
    isConnecting: isWebConnecting,
    isConnected: isWebConnected,
    connectionStatus: webConnectionStatus,
    startSession,
    endSession,
    error: webError,
    errorMessage: webErrorMessage,
  } = useLiveKitWebAssistant({
    assistantId: assistantData.id,
    assistantName: assistantData.name,
  });

  const handleAction = () => {
    if (mode === 'chat') {
      // Open web assistant dialog
      setIsWebDialogOpen(true);
    } else {
      // Open phone assistant dialog
      setIsPhoneDialogOpen(true);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'chat' ? 'talk' : 'chat');
  };

  const handlePhoneDialogClose = () => {
    setIsPhoneDialogOpen(false);
    if (isCallInProgress) {
      endCall();
    }
  };

  const handleWebDialogClose = () => {
    setIsWebDialogOpen(false);
    if (isWebConnected) {
      endSession();
    }
  };

  return (
    <>

      <div className="flex relative">
        {/* Primary button with animated content */}
        <Button
          onClick={handleAction}
          className="rounded-r-none px-4 bg-amber-500 hover:bg-amber-600 text-[var(--on-primary)] overflow-hidden relative"
        >
          <div className="flex items-center transition-transform duration-300 ease-in-out"
            style={{ transform: `translateY(${mode === 'chat' ? '0' : '-130%'})` }}>
            <MessageCircle className="h-4 w-4 mr-2" />
            <span>Web assistant</span>
          </div>
          <div className="flex items-center absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-in-out px-4"
            style={{ transform: `translateY(${mode === 'chat' ? '120%' : '0'})` }}>
            <Phone className="h-4 w-4 mr-2" />
            <span>Phone assistant</span>
          </div>
        </Button>

        {/* Toggle mode button */}
        <Button
          onClick={toggleMode}
          className="rounded-l-none border-l border-amber-600 px-2 bg-amber-500 hover:bg-amber-600 text-[var(--on-primary)]"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
            className={cn('h-4 w-4 transition-transform duration-300', {
              'rotate-180': mode === 'talk',
            })}>
            <path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </Button>
      </div>

      {/* New Phone Assistant Dialog */}
      <NewPhoneDialog
        assistantName={assistantData.name}
        assistantId={assistantData.id}
        isOpen={isPhoneDialogOpen}
        onClose={handlePhoneDialogClose}
        onCall={startCall}
        isCallInitiating={isCallInitiating}
        callStatus={callStatus}
        remainingTime={remainingTime}
        errorMessage={errorMessage}
      />

      {/* LiveKit Web Assistant Dialog */}
      <LiveKitWebAssistantDialog
        assistantName="voice-agent"
        // assistantName="monade-test"
        assistantId={assistantData.id}
        isOpen={isWebDialogOpen}
        onClose={handleWebDialogClose}
      />

    </>
  );
}