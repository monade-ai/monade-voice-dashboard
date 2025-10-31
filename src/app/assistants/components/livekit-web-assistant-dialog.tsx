// components/livekit-web-assistant-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, MessageCircle, X, User, Building, Tag } from 'lucide-react';

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
  const [messages, setMessages] = useState<Array<{text: string, sender: 'user' | 'assistant'}>>([]);
  
  const {
    isConnecting,
    isConnected,
    connectionStatus,
    startSession,
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
        [newKey.trim()]: newValue.trim()
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
    
    try {
      await startSession(calleeInfo);
      setIsSessionStarted(true);
      
      // Add initial message from assistant
      setMessages([{
        text: `Hi there! I'm ${assistantName}. How can I help you today?`,
        sender: 'assistant',
      }]);
    } catch (err) {
      console.error('[LiveKitWebAssistantDialog] Error starting session:', err);
    }
  };

  const handleEndSession = () => {
    endSession();
    setIsSessionStarted(false);
    setMessages([]);
  };

  const renderDialogContent = () => {
    if (isSessionStarted && (isConnecting || isConnected)) {
      return (
        <div className="space-y-4">
          <div className="h-64 overflow-y-auto border rounded-md p-3 mb-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-3 ${message.sender === 'assistant' ? 'pr-8' : 'pl-8'}`}
              >
                <div 
                  className={`p-3 rounded-lg ${
                    message.sender === 'assistant' 
                      ? 'bg-amber-50 text-amber-900' 
                      : 'bg-slate-100 text-slate-800 ml-auto'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {isConnected ? (
                <span className="text-green-600 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                  Connected to {assistantName}
                </span>
              ) : (
                <span className="text-amber-500">Connecting to {assistantName}...</span>
              )}
            </div>
            
            <Button
              variant="destructive"
              onClick={handleEndSession}
            >
              <X className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
          
          {connectionError && (
            <p className="text-sm text-red-500">Error: {errorMessage}</p>
          )}
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
            You'll be connected to {assistantName} in a LiveKit session.
        </p>
          
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
              Cancel
          </Button>
          <Button type="submit" disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Start Session'}
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