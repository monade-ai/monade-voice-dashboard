'use client';

import React, { useState, useEffect } from 'react';
import { Phone, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PhoneAssistant {
  id: string;
  name: string;
  avatar?: string;
}

interface CallAssistantDialogProps {
  assistant: PhoneAssistant;
  isOpen: boolean;
  onClose: () => void;
  onCall: (phoneNumber: string) => void;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  phoneNumber: string;
  contactName:string;
}

export function CallAssistantDialog({
  assistant,
  isOpen,
  onClose,
  onCall,
  isCallInitiating,
  callStatus,
  remainingTime,
  phoneNumber,
  contactName,
}: CallAssistantDialogProps) {
  useEffect(() => {
    if (isOpen && callStatus === 'idle') {
      onCall(phoneNumber);
    }
  }, [isOpen, callStatus, phoneNumber, onCall]);
  
  const formatTime = (seconds: number): string => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };
  
  const renderDialogContent = () => {
    switch (callStatus) {
    case 'initiating':
    case 'connecting':
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="animate-pulse">
            <Phone className="h-12 w-12 text-amber-500" />
          </div>
          <p className="text-center">
            {callStatus === 'initiating' 
              ? `Calling in ${formatTime(remainingTime)}` 
              : 'Connecting your call...'}
          </p>
          <p className="text-sm text-slate-500 text-center">
            {contactName} will be connected with {assistant.name} shortly
          </p>
        </div>
      );
        
    case 'connected':
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="relative">
            <Phone className="h-12 w-12 text-green-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
          <p className="font-medium">Call connected!</p>
          <div className="flex items-center justify-center rounded-full bg-red-100 h-12 w-12 cursor-pointer hover:bg-red-200 transition-colors"
            onClick={onClose}>
            <X className="h-6 w-6 text-red-600" />
          </div>
        </div>
      );
        
    case 'failed':
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="text-red-500">
            <Phone className="h-12 w-12" />
          </div>
          <p className="text-center font-medium text-red-600">Call failed</p>
          <p className="text-sm text-slate-500 text-center">
              Unable to connect your call. Please try again later.
          </p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      );
        
    default:
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="animate-pulse">
            <Phone className="h-12 w-12 text-amber-500" />
          </div>
          <p className="text-center">
              Preparing to call...
          </p>
          <p className="text-xs text-slate-500 text-center">
              You'll receive a call from {assistant.name}. Standard call rates may apply.
          </p>
        </div>
      );
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === 'idle' || callStatus === 'completed'
              ? `Call ${assistant.name}`
              : `${assistant.name}`}
          </DialogTitle>
        </DialogHeader>
        
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}