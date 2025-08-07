// components/phone-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
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

interface PhoneDialogProps {
  assistantName: string;
  isOpen: boolean;
  onClose: () => void;
  onCall: (phoneNumber: string) => void;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  errorMessage?: string | null;
}

export function PhoneDialog({
  assistantName,
  isOpen,
  onClose,
  onCall,
  isCallInitiating,
  callStatus,
  remainingTime,
  errorMessage,
}: PhoneDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PhoneDialog] Form submitted with phoneNumber:', phoneNumber);

    // Basic phone number validation
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number');
      console.error('[PhoneDialog] Validation failed: invalid phone number:', phoneNumber);
      return;
    }
    
    setError('');
    console.log('[PhoneDialog] Calling onCall with phoneNumber:', phoneNumber);
    onCall(phoneNumber);
  };
  
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
              You'll be connected with {assistantName} shortly
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
          {errorMessage && (
            <p className="text-sm text-red-500 text-center">{errorMessage}</p>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      );
        
    default:
      return (
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
                Enter your phone number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="(123) 456-7890"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                console.log('[PhoneDialog] Phone number input changed:', e.target.value);
              }}
              className={error ? 'border-red-300' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>
            
          <p className="text-xs text-slate-500">
              You'll receive a call from {assistantName}. Standard call rates may apply.
          </p>
            
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
                console.log('[PhoneDialog] Dialog closed (Cancel button)');
                onClose();
            }}>
                Cancel
            </Button>
            <Button type="submit" disabled={isCallInitiating}>
                Call
            </Button>
          </DialogFooter>
        </form>
      );
    }
  };
  
  // Log dialog open event using useEffect
  useEffect(() => {
    if (isOpen) {
      console.log('[PhoneDialog] Dialog opened for assistant:', assistantName);
    }
  }, [isOpen, assistantName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === 'idle' || callStatus === 'completed'
              ? `Call ${assistantName}`
              : `${assistantName}`}
          </DialogTitle>
        </DialogHeader>
        
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}
