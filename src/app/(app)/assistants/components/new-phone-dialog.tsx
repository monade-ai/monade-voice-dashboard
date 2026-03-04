// components/new-phone-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Phone, X, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrunks } from '@/app/hooks/use-trunks';

const COUNTRY_CODES = [
  { code: '+91', label: 'India' },
  { code: '+1', label: 'US / Canada' },
  { code: '+971', label: 'UAE' },
  { code: '+44', label: 'UK' },
  { code: '+65', label: 'Singapore' },
  { code: '+61', label: 'Australia' },
  { code: '+49', label: 'Germany' },
  { code: '+33', label: 'France' },
  { code: '+81', label: 'Japan' },
  { code: '+86', label: 'China' },
];

interface CalleeInfo {
  [key: string]: string;
}

interface NewPhoneDialogProps {
  assistantName: string;
  assistantId: string;
  isOpen: boolean;
  onClose: () => void;
  onCall: (phoneNumber: string, calleeInfo: CalleeInfo, trunkName: string) => void;
  isCallInitiating: boolean;
  callStatus: 'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed';
  remainingTime: number;
  errorMessage?: string | null;
  callProvider?: string;
}

export function NewPhoneDialog({
  assistantName,
  assistantId: _assistantId,
  isOpen,
  onClose,
  onCall,
  isCallInitiating,
  callStatus,
  remainingTime,
  errorMessage,
  callProvider,
}: NewPhoneDialogProps) {
  const { trunks } = useTrunks();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [error, setError] = useState('');
  const [calleeInfo, setCalleeInfo] = useState<CalleeInfo>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [selectedTrunk, setSelectedTrunk] = useState(callProvider || 'vobiz');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = phoneNumber.trim();
    let fullNumber: string;

    if (trimmed.startsWith('+')) {
      fullNumber = trimmed.replace(/[^\d+]/g, '');
    } else {
      const localDigits = trimmed.replace(/\D/g, '');
      fullNumber = `${countryCode}${localDigits}`;
    }

    const digits = fullNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Enter a valid phone number');
      return;
    }

    if (!selectedTrunk) {
      setError('Select a call provider');
      return;
    }

    setError('');
    onCall(fullNumber, calleeInfo, selectedTrunk);
  };

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

  const handleVariableKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCalleeInfoField();
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
            You&apos;ll be connected with {assistantName} shortly
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
        <form onSubmit={handleSubmit} className="space-y-5 py-2">

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
            <div className="flex gap-2">
              <Select
                value={countryCode}
                onValueChange={(val) => {
                  setCountryCode(val);
                  setError('');
                }}
              >
                <SelectTrigger className="w-24 shrink-0 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>
                      <span className="font-mono">{code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (e.target.value.startsWith('+')) setCountryCode('');
                  setError('');
                }}
                className={`flex-1 ${error ? 'border-red-300' : ''}`}
              />
            </div>
          </div>

          {/* Call Provider */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Provider</label>
            <Select value={selectedTrunk} onValueChange={setSelectedTrunk}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {trunks.length > 0 ? (
                  trunks.map((trunk, index) => (
                    <SelectItem key={`${trunk.id || trunk.name || 'trunk'}-${index}`} value={trunk.name}>
                      {trunk.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="vobiz">Vobiz</SelectItem>
                    <SelectItem value="twilio">Twilio</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {(error || errorMessage) && (
            <p className="text-sm text-red-500">{error || errorMessage}</p>
          )}

          {/* Call Variables */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Call Variables</p>
              <p className="text-xs text-muted-foreground mt-0.5">Optional context passed to the assistant</p>
            </div>

            {/* Chips */}
            {Object.keys(calleeInfo).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(calleeInfo).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted text-xs font-medium"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{value}</span>
                    <button
                      type="button"
                      onClick={() => removeCalleeInfoField(key)}
                      className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add row */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Variable"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={handleVariableKeyDown}
                className="flex-1 h-9 text-sm"
              />
              <Input
                type="text"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleVariableKeyDown}
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addCalleeInfoField}
                disabled={!newKey.trim() || !newValue.trim()}
                className="h-9 w-9 p-0 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {(newKey || newValue) && (
              <p className="text-[11px] text-muted-foreground">Press Enter to add</p>
            )}
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={() => {
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

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setCountryCode('+91');
      setError('');
      setCalleeInfo({});
      setNewKey('');
      setNewValue('');
      setSelectedTrunk(callProvider || 'vobiz');
    }
  }, [isOpen, assistantName, callProvider]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {callStatus === 'idle' || callStatus === 'completed'
              ? `Call ${assistantName}`
              : assistantName}
          </DialogTitle>
        </DialogHeader>

        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}
