'use client';

import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIVoiceInputProps {
  isActive: boolean;
  onChange: (isActive: boolean) => void;
  className?: string;
  demoMode?: boolean;
}

export function AIVoiceInput({
  isActive,
  onChange,
  className,
  demoMode = false,
}: AIVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle recording state changes
  useEffect(() => {
    if (!isActive && isRecording) {
      setIsRecording(false);
    }
  }, [isActive, isRecording]);

  // Demo mode animations
  useEffect(() => {
    if (demoMode && isRecording) {
      const interval = setInterval(() => {
        setIsAnimating(prev => !prev);
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [demoMode, isRecording]);

  const handleToggle = () => {
    // If we're not active, try to activate
    if (!isActive) {
      onChange(true);
      return;
    }
    
    // Toggle recording state
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    // In demo mode, we don't actually change the active state
    if (!demoMode) {
      // If we're stopping recording and this is the last action,
      // we can deactivate the whole input
      if (!newRecordingState) {
        // Optional: Add a delay before deactivation
        // setTimeout(() => onChange(false), 1000);
      }
    }
  };

  // Determine the button's appearance
  const getButtonAppearance = () => {
    // Loading state when active but not yet ready
    if (isActive && !isRecording) {
      return {
        variant: "outline" as const,
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        className: "bg-slate-100 hover:bg-slate-200 border-slate-200"
      };
    }
    
    // Recording state
    if (isRecording) {
      return {
        variant: "destructive" as const,
        icon: <MicOff className="h-4 w-4" />,
        className: `bg-red-500 hover:bg-red-600 ${
          isAnimating && demoMode ? "ring-4 ring-red-200" : ""
        }`
      };
    }
    
    // Default state
    return {
      variant: "default" as const,
      icon: <Mic className="h-4 w-4" />,
      className: "bg-amber-500 hover:bg-amber-600"
    };
  };

  const { variant, icon, className: buttonClassName } = getButtonAppearance();

  return (
    <div className={cn("relative", className)}>
      <Button
        variant={variant}
        size="icon"
        onClick={handleToggle}
        className={cn(buttonClassName)}
        disabled={!isActive && !demoMode}
      >
        {icon}
      </Button>
      
      {/* Pulse animation during recording */}
      {isRecording && !demoMode && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-25" />
      )}
    </div>
  );
}