// components/new-phone-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Phone, X, User, Building, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CalleeInfo {
  [key: string]: string;
}

interface NewPhoneDialogProps {
  assistantName: string;
  assistantId: string;
  isOpen: boolean;
  onClose: () => void;
  onCall: (phoneNumber: string, calleeInfo: CalleeInfo) => void;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  errorMessage?: string | null;
}

export function NewPhoneDialog({
  assistantName,
  assistantId,
  isOpen,
  onClose,
  onCall,
  isCallInitiating,
  callStatus,
  remainingTime,
  errorMessage,
}: NewPhoneDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [calleeInfo, setCalleeInfo] = useState<CalleeInfo>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewPhoneDialog] Form submitted with phoneNumber:', phoneNumber, 'and calleeInfo:', calleeInfo);

    // Basic phone number validation
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number');
      console.error('[NewPhoneDialog] Validation failed: invalid phone number:', phoneNumber);
      return;
    }
    
    setError('');
    console.log('[NewPhoneDialog] Calling onCall with phoneNumber:', phoneNumber, 'and calleeInfo:', calleeInfo);
    onCall(phoneNumber, calleeInfo);
  };

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

  const formatTime = (seconds: number): string => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (number: string): string => {
    // Add +91 prefix if not present and number doesn't already have a country code
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length >= 10 && !number.startsWith('+')) {
      // Assuming Indian numbers if 10 digits
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      // If it's already longer, assume it has country code
      return `+${cleaned}`;
    }
    return number;
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
                Enter phone number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., +911234567890 or 1234567890"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                console.log('[NewPhoneDialog] Phone number input changed:', e.target.value);
              }}
              className={error ? 'border-red-300' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
                Callee Information (Optional)
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
              You'll receive a call from {assistantName}. Standard call rates may apply.
          </p>
            
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
                console.log('[NewPhoneDialog] Dialog closed (Cancel button)');
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
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setError('');
      setCalleeInfo({});
      setNewKey('');
      setNewValue('');
      console.log('[NewPhoneDialog] Dialog opened for assistant:', assistantName);
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