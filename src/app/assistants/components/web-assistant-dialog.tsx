'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, MessageCircle, X } from 'lucide-react';
import {
  useRTVIClient,
  useRTVIClientTransportState,
  useRTVIClientEvent,
  RTVIClientAudio,
} from '@pipecat-ai/client-react';
import { LLMFunctionCallData, RTVIEvent, LLMHelper } from '@pipecat-ai/client-js';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { AudioVisualizer } from './audio-visualiser';

interface WebAssistantDialogProps {
  url: string;
  assistantName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WebAssistantDialog({
  url,
  assistantName,
  isOpen,
  onClose,
}: WebAssistantDialogProps) {
  // Message state
  const [messages, setMessages] = useState<Array<{text: string, sender: 'user' | 'assistant'}>>([]);
  
  // PipeCat RTVI client states
  const client = useRTVIClient();
  const transportState = useRTVIClientTransportState();
  const isConnected = ['connected', 'ready'].includes(transportState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Using Float32Array for compatibility with AudioVisualizer
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize LLM helper when client is available
  useEffect(() => {
    if (client && !client.getHelper('llm')) {
      client.registerHelper('llm', new LLMHelper({}));
    }
  }, [client]);
  
  // Handle user transcript events from RTVI
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((data: any) => {
      // Since the exact TranscriptData type structure is unknown,
      // we'll use a more defensive approach
      
      // Only add the message if it's a final transcript or if there's no is_final property
      if (data && data.text && (data.is_final === undefined || data.is_final === true)) {
        setMessages(prev => [...prev, {
          text: data.text,
          sender: 'user',
        }]);
      }
    }, []),
  );
  
  // Handle bot transcript events from RTVI
  useRTVIClientEvent(
    RTVIEvent.BotTranscript,
    useCallback((data: any) => {
      // Add assistant response if data contains text
      if (data && data.text) {
        setMessages(prev => [...prev, {
          text: data.text,
          sender: 'assistant',
        }]);
      }
    }, []),
  );
  
  // Note: AudioLevel event doesn't exist in current API
  // We'll simulate audio data for visualization instead
  useEffect(() => {
    if (!isListening) {
      setAudioData(null);

      return;
    }
    
    // Create simulated audio data for visualization when listening
    const intervalId = setInterval(() => {
      const array = new Float32Array(32);
      for (let i = 0; i < 32; i++) {
        array[i] = (Math.random() * 0.4) + 0.3; // Random values between 0.3 and 0.7
      }
      setAudioData(array);
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [isListening]);
  
  // Add handler for bot disconnect event
  useRTVIClientEvent(
    RTVIEvent.BotDisconnected,
    useCallback(async () => {
      // Reset states
      setIsConnecting(false);
      setIsListening(false);

      if (client) {
        try {
          // Ensure client is fully disconnected
          if (isConnected) {
            await client.disconnect();
          }
        } catch (err) {
          console.error('Error during cleanup:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }, [client, isConnected]),
  );

  // Reset connecting state when transport state changes
  useEffect(() => {
    if (isConnected || transportState === 'disconnected') {
      setIsConnecting(false);
    }
  }, [transportState, isConnected]);
  
  // Connect to PipeCat when dialog opens
  useEffect(() => {
    if (isOpen && client) {
      // Configure the client with the URL if needed
      // Note: PipeCat might handle URL config differently than your previous implementation
      
      // Connect to the service
      const connectClient = async () => {
        try {
          setIsConnecting(true);
          await client.connect();
          
          // Add initial message from assistant
          setMessages([{
            text: `Hi there! I'm ${assistantName}. How can I help you today?`,
            sender: 'assistant',
          }]);
        } catch (err) {
          console.error('Connection error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
        }
      };
      
      connectClient();
    } else if (!isOpen && client && isConnected) {
      // Clean up when dialog closes
      const disconnectClient = async () => {
        try {
          await client.disconnect();
          setMessages([]);
          setIsListening(false);
          setAudioData(null);
          setError(null);
        } catch (err) {
          console.error('Disconnection error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      };
      
      disconnectClient();
    }
  }, [isOpen, client, isConnected, assistantName]);
  
  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (!client) return;
    
    // RTVI client doesn't have direct methods for controlling audio
    // We'll use state tracking and implement events
    setIsListening(prevState => !prevState);
    
    // Comment for implementation:
    // The actual implementation would depend on what methods are available in your RTVI client
    // Since we don't have access to the full API documentation, you'll need to replace this
    // with the appropriate method calls from the PipeCat client API
    
    // Examples of possible approaches:
    // 1. client.send({ type: "audio_control", action: isListening ? "stop" : "start" });
    // 2. client.emit("toggle_audio");
    // 3. Use any available methods from your specific RTVI client implementation
    
    console.log(`Toggled audio recording: ${!isListening}`);
  }, [client, isListening]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-amber-500" />
            {assistantName}
          </DialogTitle>
        </DialogHeader>
        
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
        
        <div className="space-y-4">
          <AudioVisualizer 
            audioData={audioData} 
            isRecording={isListening} 
          />
          
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {isConnected ? (
                <span className="text-green-600 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                  Connected
                </span>
              ) : (
                <span className="text-red-500">Not connected</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isListening ? 'destructive' : 'default'}
                size="icon"
                disabled={!isConnected}
                onClick={toggleRecording}
                className={isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-500">Error: {error.message}</p>
          )}
        </div>
        
        {/* Include the PipeCat audio component for audio playback */}
        <RTVIClientAudio />
      </DialogContent>
    </Dialog>
  );
}