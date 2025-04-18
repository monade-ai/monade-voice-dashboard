// hooks/use-websocket-microphone.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketMicrophoneProps {
  serverUrl: string;
  onMessage?: (message: any) => void;
  autoConnect?: boolean;
}

interface UseWebSocketMicrophoneReturn {
  isConnected: boolean;
  isRecording: boolean;
  audioData: Float32Array | null;
  connect: () => void;
  disconnect: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  error: Error | null;
}

export function useWebSocketMicrophone({
  serverUrl,
  onMessage,
  autoConnect = false,
}: UseWebSocketMicrophoneProps): UseWebSocketMicrophoneReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onMessageRef = useRef(onMessage);

  // Update the ref when the callback changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) return;
      
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      // Create new WebSocket connection
      const ws = new WebSocket(serverUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        console.debug('Incoming WebSocket message:', event.data);
        try {
          const message = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
      
      socketRef.current = ws;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error connecting to WebSocket'));
      console.error('Error establishing WebSocket connection:', err);
    }
  }, [serverUrl]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (isRecording) {
      stopRecordingInternal();
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
  }, [isRecording]);

  // Internal function to stop recording
  const stopRecordingInternal = useCallback(() => {
    // Disconnect and clean up audio processing
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    setAudioData(null);
  }, []);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (!isConnected) {
      setError(new Error('Cannot start recording: WebSocket not connected'));

      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Initialize audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Create input source from mic
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create processor node to handle audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      // Process audio data - use a separate variable to avoid referencing state
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const audioDataCopy = new Float32Array(input);
        
        // Update state with new audio data, but only if we're still recording
        // This ensures we don't update state if the component is unmounting
        if (streamRef.current && processorRef.current) {
          setAudioData(audioDataCopy);
          
          // Send audio data to WebSocket if connected
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            try {
              console.debug('Sending audio data:', audioDataCopy.length, 'samples');
              socketRef.current.send(JSON.stringify({
                type: 'audio',
                data: Array.from(audioDataCopy.slice(0, 100)), // Send truncated data for performance
              }));
            } catch (err) {
              console.error('Error sending audio data:', err);
            }
          }
        }
      };
      
      // Connect nodes: source -> processor -> destination
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error starting recording'));
      console.error('Error starting audio recording:', err);
    }
  }, [isConnected]);

  // Public-facing stop recording function
  const stopRecording = useCallback(() => {
    stopRecordingInternal();
  }, [stopRecordingInternal]);

  // Auto-connect if enabled (using a stable dependency)
  useEffect(() => {
    let mounted = true;
    
    if (autoConnect && mounted) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (processorRef.current && audioContextRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  return {
    isConnected,
    isRecording,
    audioData,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    error,
  };
}