// components/new-phone-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Phone, X, AlertTriangle } from 'lucide-react';

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
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'US / Canada (+1)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
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
  callProvider?: string; // New prop for saved provider
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
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState('');
  const [calleeInfo, setCalleeInfo] = useState<CalleeInfo>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  // Use saved provider if available, otherwise default to vobiz
  const [selectedTrunk, setSelectedTrunk] = useState(callProvider || 'vobiz');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Compose the full E.164 number
    let fullNumber: string;
    const trimmed = phoneNumber.trim();

    if (trimmed.startsWith('+')) {
      // User typed the full E.164 number directly — use as-is
      fullNumber = trimmed.replace(/[^\d+]/g, '');
    } else if (countryCode) {
      // Combine selected country code + local digits
      const localDigits = trimmed.replace(/\D/g, '');
      fullNumber = `${countryCode}${localDigits}`;
    } else {
      setError('Select a country code, or enter the full number with a + prefix (e.g. +91...)');
      return;
    }

    const digits = fullNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    if (!selectedTrunk) {
      setError('Please select a trunk provider (Twilio or Vobiz)');
      return;
    }

    setError('');
    console.log('[NewPhoneDialog] Calling onCall with phoneNumber:', fullNumber, 'trunk:', selectedTrunk, 'calleeInfo:', calleeInfo);
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
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </label>
            <div className="flex gap-2">
              {/* Country code selector */}
              <Select
                value={countryCode}
                onValueChange={(val) => {
                  setCountryCode(val);
                  setError('');
                }}
              >
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue placeholder="+code" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Local number */}
              <Input
                id="phone"
                type="tel"
                placeholder={phoneNumber.startsWith('+') ? '+91 9876543210' : '9876543210'}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  // If user starts typing a full E.164 number, clear country code
                  if (e.target.value.startsWith('+')) {
                    setCountryCode('');
                  }
                  setError('');
                }}
                className={error ? 'border-red-300 flex-1' : 'flex-1'}
              />
            </div>
            {!phoneNumber.startsWith('+') && !countryCode && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Select a country code above, or type the full number starting with +
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              E.164 format required (e.g., +91 9876543210 for India, +1 2025551234 for US)
            </p>
          </div>

          {/* Call Provider Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
                Call Provider
            </label>
            <Select value={selectedTrunk} onValueChange={setSelectedTrunk}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select trunk provider" />
              </SelectTrigger>
              <SelectContent>
                {trunks.length > 0 ? (
                  trunks.map((trunk, index) => (
                    <SelectItem key={`${trunk.id || trunk.name || 'trunk'}-${index}`} value={trunk.name}>
                      <span className="font-medium">{trunk.name}</span>
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem key="vobiz" value="vobiz">Vobiz (Indian calls)</SelectItem>
                    <SelectItem key="twilio" value="twilio">Twilio (International)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {callProvider && selectedTrunk === callProvider && (
              <p className="text-xs text-green-600">
                  ✓ Using saved provider from assistant settings
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

          {/* Callee Info Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
                Callee Information (Optional)
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto p-2 border rounded-md">
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
            You&apos;ll receive a call from {assistantName}. Standard call rates may apply.
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
      setCountryCode('');
      setError('');
      setCalleeInfo({});
      setNewKey('');
      setNewValue('');
      // Use saved provider if available, otherwise default to vobiz
      setSelectedTrunk(callProvider || 'vobiz');
      console.log('[NewPhoneDialog] Dialog opened for assistant:', assistantName, 'provider:', callProvider);
    }
  }, [isOpen, assistantName, callProvider]);

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
