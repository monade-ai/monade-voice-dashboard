'use client';

import { useState, useEffect, useMemo } from 'react';
import { Mic, MicOff, MessageCircle, PhoneOff } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { 
  RoomAudioRenderer, 
  RoomContext, 
  StartAudio,
  useVoiceAssistant,
  useLocalParticipant,
  useRoomContext,
  BarVisualizer
} from '@livekit/components-react';

import { Button } from '@/components/ui/button';
import { Transcript } from './embed/transcript';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface AgentStarterEmbedProps {
  roomName: string;
  agentName: string;
  serverUrl: string;
  participantToken: string;
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: () => void;
  onError?: (error: Error) => void;
}

// Component that runs inside the RoomContext
function AgentStarterEmbedContent({
  agentName,
  onDisconnect
}: {
  agentName: string;
  onDisconnect: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: `Hi! I'm your Monade assistant. How can I help you today?`,
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  
  const {
    state: agentState,
  } = useVoiceAssistant();
  
  const { isMicrophoneEnabled, microphoneTrack, localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  
  // Create mic track reference for visualization
  const micTrackRef = useMemo(() => {
    return {
      participant: localParticipant,
      source: Track.Source.Microphone,
      publication: microphoneTrack,
    };
  }, [localParticipant, microphoneTrack]);
  
  // Check microphone permission and track status
  useEffect(() => {
    console.log('[AgentStarterEmbed] Microphone track effect triggered:', {
      hasMicrophoneTrack: !!microphoneTrack,
      trackDetails: microphoneTrack ? {
        source: microphoneTrack.source,
        hasMediaStreamTrack: !!microphoneTrack?.mediaStreamTrack,
        isEnabled: microphoneTrack?.mediaStreamTrack?.enabled,
        readyState: microphoneTrack?.mediaStreamTrack?.readyState,
        muted: microphoneTrack?.mediaStreamTrack?.muted
      } : null
    });
    
    if (microphoneTrack && microphoneTrack.mediaStreamTrack) {
      console.log('[AgentStarterEmbed] Microphone track available:', {
        enabled: microphoneTrack.mediaStreamTrack.enabled,
        readyState: microphoneTrack.mediaStreamTrack.readyState,
        muted: microphoneTrack.mediaStreamTrack.muted
      });
      setMicPermissionGranted(true);
    } else {
      console.log('[AgentStarterEmbed] No microphone track or media stream track yet');
      setMicPermissionGranted(false);
    }
  }, [microphoneTrack]);
   
  // Handle room events
  useEffect(() => {
    if (!room) return;
    
    const onDisconnected = () => {
      console.log('[AgentStarterEmbed] Room disconnected');
      onDisconnect();
    };
    
    const onDataReceived = (payload: Uint8Array, participant: any) => {
      if (participant?.identity?.includes('agent')) {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === 'transcript' && data.text) {
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: data.text,
              sender: 'assistant',
              timestamp: new Date()
            }]);
          }
        } catch (e) {
          console.warn('[AgentStarterEmbed] Error parsing data:', e);
        }
      }
    };
    
    const onMediaDevicesError = (error: Error) => {
      console.error('[AgentStarterEmbed] Media devices error:', error);
    };
    
    const onTrackPublished = (publication: any) => {
      console.log('[AgentStarterEmbed] Track published:', publication.kind);
    };
    
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.DataReceived, onDataReceived);
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.LocalTrackPublished, onTrackPublished);
     
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.DataReceived, onDataReceived);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
      room.off(RoomEvent.LocalTrackPublished, onTrackPublished);
    };
  }, [room, onDisconnect]);

  const toggleMicrophone = async () => {
    if (!room) return;
    
    try {
      console.log('[AgentStarterEmbed] Toggling microphone:', !isMicrophoneEnabled);
      await room.localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      console.log('[AgentStarterEmbed] Microphone toggled successfully:', !isMicrophoneEnabled);
    } catch (error) {
      console.error('[AgentStarterEmbed] Error toggling microphone:', error);
    }
  };

  return (
    <>
      <RoomAudioRenderer />
      <StartAudio label="Click to enable audio" />
       
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full md:w-[360px] md:mr-4 mb-4 rounded-t-2xl md:rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-amber-500" />
              <span className="font-semibold">{agentName}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onDisconnect}
              className="h-8 w-8"
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-4">
            <Transcript messages={messages} />
          </div>
          
          {/* Audio Visualizer with speech detection using LiveKit's BarVisualizer */}
          <div className="flex justify-center p-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 w-full max-w-[200px] h-24 flex flex-col items-center justify-center">
              {/* LiveKit BarVisualizer */}
              <div className="flex h-12 w-full items-center justify-center mb-2">
                {isMicrophoneEnabled && micTrackRef ? (
                  <BarVisualizer
                    barCount={5}
                    trackRef={micTrackRef}
                    options={{ minHeight: 4 }}
                    className="flex h-full w-auto items-center justify-center gap-1"
                  >
                    <span
                      className={`w-2 rounded-t transition-all duration-75 ${
                        isMicrophoneEnabled 
                          ? 'bg-amber-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ height: '100%' }}
                    />
                  </BarVisualizer>
                ) : (
                  // Fallback visualization when microphone is off
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 rounded-t bg-gray-300 dark:bg-gray-600"
                        style={{ height: '4px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Status indicator */}
              <div className="text-xs text-center">
                {isMicrophoneEnabled ? (
                  <span className="text-amber-600">Listening</span>
                ) : (
                  <span className="text-red-500">Microphone off</span>
                )}
                {/* Debug indicator for audio analysis status */}
                <div className="text-xs mt-1">
                  {microphoneTrack ? (
                    <span className="text-green-500">✓ Audio ready</span>
                  ) : (
                    <span className="text-yellow-500">⚠ Audio pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-green-600 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-600 mr-2"></span>
                  Connected
                </span>
                {!micPermissionGranted && (
                  <span className="text-orange-600 text-xs mt-1 block">
                    Waiting for mic permission...
                  </span>
                )}
              </div>
               
              <div className="flex gap-2">
                <Button
                  variant={isMicrophoneEnabled ? 'default' : 'destructive'}
                  size="icon"
                  onClick={toggleMicrophone}
                  className={isMicrophoneEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                >
                  {isMicrophoneEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>
                 
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDisconnect}
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function AgentStarterEmbed({
  roomName,
  agentName,
  serverUrl,
  participantToken,
  isOpen,
  onClose,
  onDisconnect,
  onError // New prop
}: AgentStarterEmbedProps) {
  // Create room with basic configuration
  const room = useMemo(() => {
    try {
      // Create a basic room instance
      const roomInstance = new Room();
      
      // Add comprehensive error handling
      roomInstance.on(RoomEvent.Disconnected, (reason) => {
        console.log('[AgentStarterEmbed] Room disconnected:', reason);
      });
      
      roomInstance.on(RoomEvent.Reconnecting, () => {
        console.log('[AgentStarterEmbed] Room reconnecting...');
      });
      
      roomInstance.on(RoomEvent.Reconnected, () => {
        console.log('[AgentStarterEmbed] Room reconnected');
      });
      
      roomInstance.on(RoomEvent.MediaDevicesError, (error) => {
        console.error('[AgentStarterEmbed] Media devices error:', error);
      });
      
      roomInstance.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('[AgentStarterEmbed] Connection state changed:', state);
      });
      
      return roomInstance;
    } catch (error) {
      console.error('[AgentStarterEmbed] Error creating room:', error);
      // Fallback to basic room if options fail
      return new Room();
    }
  }, []);
  
  // Connect to room when component opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    
    if (!participantToken) {
      console.error('[AgentStarterEmbed] Error: No participant token provided');
      return;
    }
    
    if (room.state !== 'disconnected') {
      console.log('[AgentStarterEmbed] Room already connected, skipping');
      return;
    }

    const connect = async () => {
      try {
        console.log('[AgentStarterEmbed] Connecting to room...');
        
        // Enable microphone BEFORE connecting to the room (matching original implementation)
        // Use Promise.all to enable microphone and connect simultaneously
        await Promise.all([
          room.localParticipant.setMicrophoneEnabled(true, undefined, {
            preConnectBuffer: true
          }),
          room.connect(serverUrl, participantToken)
        ]);
        
        console.log('[AgentStarterEmbed] Connected to room and enabled microphone:', {
          roomName: room.name,
          roomSid: room.sid,
          localParticipant: room.localParticipant?.identity,
          localParticipantSid: room.localParticipant?.sid
        });
        
      } catch (error) {
        console.error('[AgentStarterEmbed] Error connecting to agent:', error);
        // Add specific handling for network errors
        if (error instanceof Error) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            console.log('[AgentStarterEmbed] Network issue detected, you may need to check your connection');
          }
          // Notify parent component of error
          onError?.(error);
        }
      }
    };

    connect();
    
    // Cleanup on unmount or close
    return () => {
      if (room.state !== 'disconnected') {
        console.log('[AgentStarterEmbed] Disconnecting room on cleanup');
        room.disconnect();
      }
    };
  }, [isOpen, room, serverUrl, participantToken]);

  // NOTE: We're NOT calling onDisconnect here to prevent immediate disconnection
  // The parent component will handle disconnection when needed
  const handleDisconnect = () => {
    if (room.state !== 'disconnected') {
      room.disconnect();
    }
    // Don't call onDisconnect here to prevent interference with parent component
    // Just disconnect the room, let the parent handle the UI state
  };
  
  // Prevent accidental closure - only allow closing via disconnect button
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Don't close if clicking on the popup itself
    if (e.target === e.currentTarget) {
      // Do nothing - prevent closing
      return;
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <RoomContext.Provider value={room}>
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center md:items-center md:justify-end"
        onClick={handleBackgroundClick}
      >
        <AgentStarterEmbedContent 
          agentName={agentName}
          onDisconnect={onDisconnect}
        />
      </div>
    </RoomContext.Provider>
  );
}