'use client';

import { useState, useEffect } from 'react';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useKnowledgeBase } from '@/app/hooks/use-knowledge-base';
import { useContactsContext } from '@/app/contacts/contexts/contacts-context';
import { useTrunks, deallocatePhoneNumber } from '@/app/hooks/use-trunks';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';


// Define available providers and their models
const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral AI' },
];

const modelsByProvider = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4-vision', label: 'GPT-4 Vision' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'tts-1', label: 'TTS-1' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-ultra', label: 'Gemini Ultra' },
  ],
  mistral: [
    { value: 'mistral-large', label: 'Mistral Large' },
    { value: 'mistral-medium', label: 'Mistral Medium' },
    { value: 'mistral-small', label: 'Mistral Small' },
  ],
};

const voicesByProvider = {
  openai: [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'shimmer', label: 'Shimmer' },
  ],
  anthropic: [
    { value: 'claude', label: 'Claude' },
    { value: 'sage', label: 'Sage' },
  ],
  google: [
    { value: 'harmonic', label: 'Harmonic' },
    { value: 'crystal', label: 'Crystal' },
  ],
  mistral: [
    { value: 'mistral-voice', label: 'Mistral Voice' },
  ],
};

// Define the props type including the new handler
interface ModelTabProps {
  onChangesMade: () => void;
}

export default function ModelTab({ onChangesMade }: ModelTabProps) {
  const { currentAssistant, updateAssistantLocally } = useAssistants();
  const { knowledgeBases } = useKnowledgeBase();
  const { buckets } = useContactsContext();
  const { trunks, phoneNumbers, loading: phoneNumbersLoading, checkingAssignments, refreshAssignments } = useTrunks();
  const [deallocating, setDeallocating] = useState<string | null>(null);

  const [provider, setProvider] = useState(currentAssistant?.provider || 'openai');
  const [model, setModel] = useState(currentAssistant?.model || 'tts-1');
  const [voice, setVoice] = useState(currentAssistant?.voice || 'alloy');
  const [phoneNumber, setPhoneNumber] = useState(currentAssistant?.phoneNumber || '');
  const [callProvider, setCallProvider] = useState(currentAssistant?.callProvider || 'vobiz');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState(currentAssistant?.knowledgeBase || '');
  const [contactBucketId, setContactBucketId] = useState(currentAssistant?.contact_bucket_id || '');

  // Generate provider options from trunks
  const callProviderOptions = trunks.length > 0 ? trunks.map(trunk => ({
    value: trunk.name,
    label: trunk.name.charAt(0).toUpperCase() + trunk.name.slice(1),
    description: trunk.name.toLowerCase().includes('vobiz')
      ? 'Indian calls - Best for +91 numbers'
      : trunk.name.toLowerCase().includes('twilio')
        ? 'International calls - Global coverage'
        : `SIP Trunk: ${trunk.address}`
  })) : [
    // Fallback if no trunks loaded yet
    { value: 'vobiz', label: 'Vobiz', description: 'Indian calls - Best for +91 numbers' },
    { value: 'twilio', label: 'Twilio', description: 'International calls - Global coverage' }
  ];

  // Synchronize local state with currentAssistant when it changes
  useEffect(() => {
    setProvider(currentAssistant?.provider || 'openai');
    setModel(currentAssistant?.model || 'tts-1');
    setVoice(currentAssistant?.voice || 'alloy');
    setPhoneNumber(currentAssistant?.phoneNumber || '');
    setCallProvider(currentAssistant?.callProvider || 'vobiz');
    setKnowledgeBaseId(currentAssistant?.knowledgeBase || '');
    setContactBucketId(currentAssistant?.contact_bucket_id || '');
  }, [currentAssistant]);

  // Handle phone number selection from dropdown
  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { phoneNumber: value });
      onChangesMade(); // Mark changes
    }
  };

  // Handle call provider change
  const handleCallProviderChange = (value: string) => {
    // Convert 'none' to empty string for storage, but keep state for UI
    const actualValue = value === 'none' ? '' : value;
    console.log('[ModelTab] Provider changed to:', value, '-> storing:', actualValue);
    setCallProvider(actualValue);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { callProvider: actualValue });
      onChangesMade(); // Mark changes
    }
  };

  // Handle deallocating a phone number from another assistant
  const handleDeallocate = async (assistantId: string, phoneNum: string) => {
    if (!assistantId) return;

    setDeallocating(assistantId);
    try {
      const result = await deallocatePhoneNumber(assistantId);
      if (result.success) {
        toast.success(`Phone number ${phoneNum} has been deallocated`);
        // Refresh the assignments list
        refreshAssignments();
      } else {
        toast.error(result.error || 'Failed to deallocate phone number');
      }
    } catch (err) {
      toast.error('An error occurred while deallocating');
    } finally {
      setDeallocating(null);
    }
  };

  // Get available models for selected provider
  const availableModels = modelsByProvider[provider as keyof typeof modelsByProvider] || [];

  // Get available voices for selected provider
  const availableVoices = voicesByProvider[provider as keyof typeof voicesByProvider] || [];

  // Update the assistant when selections change
  const handleProviderChange = (value: string) => {
    setProvider(value);

    // Reset model and voice to first options from the new provider
    const firstModel = modelsByProvider[value as keyof typeof modelsByProvider]?.[0]?.value || '';
    const firstVoice = voicesByProvider[value as keyof typeof voicesByProvider]?.[0]?.value || '';

    setModel(firstModel);
    setVoice(firstVoice);

    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, {
        provider: value,
        model: firstModel,
        voice: firstVoice,
      });
      onChangesMade(); // Mark changes
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { model: value });
      onChangesMade(); // Mark changes
    }
  };

  const handleVoiceChange = (value: string) => {
    setVoice(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { voice: value });
      onChangesMade(); // Mark changes
    }
  };

  // Handler for knowledge base change
  const handleKnowledgeBaseChange = (value: string) => {
    setKnowledgeBaseId(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { knowledgeBase: value });
      onChangesMade(); // Mark changes
    }
  };

  return (
    <div className="space-y-8">
      {/* Phone Number Section - TEMPORARILY COMMENTED OUT
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Phone Number</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select a phone number to associate with this assistant. This will be used for outbound calls.
          {checkingAssignments && <span className="ml-2 text-xs text-blue-500">(Checking assignments...)</span>}
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="assistant-phone-number" className="text-sm font-medium">
              Select from available numbers
            </label>
            <div className="flex gap-2">
              <Select value={phoneNumber || '__none__'} onValueChange={(v) => handlePhoneNumberChange(v === '__none__' ? '' : v)}>
                <SelectTrigger className="flex-1 bg-white">
                  <SelectValue placeholder={phoneNumbersLoading ? 'Loading...' : 'Select phone number'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-gray-500 italic">— None (Deallocate/Release number) —</span>
                  </SelectItem>
                  {phoneNumbers.map((phone) => (
                    <SelectItem key={phone.number} value={phone.number}>
                      <div className="flex items-center gap-2">
                        <span>{phone.number}</span>
                        {phone.assignedAssistantName && phone.assignedAssistantId !== currentAssistant?.id && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            Used by: {phone.assignedAssistantName}
                          </span>
                        )}
                        {phone.assignedAssistantId === currentAssistant?.id && (
                          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {phoneNumber && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhoneNumberChange('')}
                  className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="manual-phone-input" className="text-sm font-medium">
              Or enter custom number
            </label>
            <div className="flex gap-2">
              <input
                id="manual-phone-input"
                type="text"
                value={phoneNumber}
                onChange={(e) => handlePhoneNumberChange(e.target.value)}
                placeholder="Enter phone number (e.g., +919876543210)"
                className="flex-1 px-3 py-2 border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              Enter a phone number manually if it's not in the dropdown. Include country code.
            </p>
          </div>

          {phoneNumber && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-green-800">Current Phone Number</span>
                  <p className="font-mono text-sm text-green-700">{phoneNumber}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePhoneNumberChange('')}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {phoneNumbers.filter(p => p.assignedAssistantId && p.assignedAssistantId !== currentAssistant?.id).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Other Assigned Numbers</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {phoneNumbers.filter(p => p.assignedAssistantId && p.assignedAssistantId !== currentAssistant?.id).map((phone) => (
                  <div
                    key={phone.number}
                    className="flex items-center justify-between p-2 bg-white rounded border"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{phone.number}</span>
                      <span className="text-xs text-gray-500">
                        Used by: {phone.assignedAssistantName}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeallocate(phone.assignedAssistantId!, phone.number)}
                      disabled={deallocating === phone.assignedAssistantId}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {deallocating === phone.assignedAssistantId ? 'Deallocating...' : 'Deallocate'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      END OF COMMENTED OUT PHONE NUMBER SECTION */}


      {/* Call Provider Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Call Provider</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the telephony provider for outbound calls made by this assistant.
        </p>
        <div className="space-y-2">
          <label htmlFor="call-provider" className="text-sm font-medium">
            Provider
          </label>
          <div className="flex gap-2">
            <Select
              value={callProvider || 'vobiz'}
              onValueChange={handleCallProviderChange}
            >
              <SelectTrigger className="flex-1 bg-white">
                <SelectValue placeholder="Select call provider" />
              </SelectTrigger>
              <SelectContent>
                {callProviderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {callProvider && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCallProviderChange('')}
                className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap"
              >
                Clear
              </Button>
            )}
          </div>
          {callProvider ? (
            <p className="text-xs text-gray-500 mt-2">
              {callProviderOptions.find(opt => opt.value === callProvider)?.description
                || `✓ Selected provider: ${callProvider}`}
            </p>
          ) : (
            <p className="text-xs text-orange-600 mt-2">
              ⚠ No provider selected - click a provider to enable calls, or save without one
            </p>
          )}
        </div>
      </div>

      {/* Knowledge Base Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Knowledge Base</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the knowledge base this assistant should use for answering questions.
        </p>
        <div className="space-y-2">
          <label htmlFor="knowledge-base" className="text-sm font-medium">
            Knowledge Base
          </label>
          <Select value={knowledgeBaseId} onValueChange={handleKnowledgeBaseChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder={knowledgeBases.length === 0 ? 'No KBs found' : 'Select knowledge base'} />
            </SelectTrigger>
            <SelectContent>
              {knowledgeBases.length === 0 ? (
                <SelectItem value="none" disabled>No knowledge bases available</SelectItem>
              ) : (
                knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id}>
                    {kb.filename}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact Bucket Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Contact Bucket</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the contact bucket to associate with this assistant. This will be used for contact-related features.
        </p>
        <div className="space-y-2">
          <label htmlFor="contact-bucket" className="text-sm font-medium">
            Contact Bucket
          </label>
          <Select
            value={contactBucketId || 'none'}
            onValueChange={(value) => {
              const bucketId = value === 'none' ? null : value;
              setContactBucketId(bucketId);
              if (currentAssistant) {
                updateAssistantLocally(currentAssistant.id, { contact_bucket_id: bucketId });
                onChangesMade();
              }
            }}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder={buckets.length === 0 ? 'No buckets found' : 'Select contact bucket'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {buckets.length === 0 ? (
                <SelectItem value="none" disabled>No buckets available</SelectItem>
              ) : (
                buckets.map((bucket) => (
                  <SelectItem key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Voice Configuration Section */}
      {/* <div className="border rounded-lg p-6 bg-gray-50"> */}
      {/* <h3 className="text-lg font-medium mb-2">Voice Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose from the list of voices, or sync your voice library if you aren't able to find your voice in the dropdown.
          If you are still facing any error, you can enable custom voice and add a voice ID manually.
        </p> */}

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
      {/* Provider Selection */}
      {/* <div className="space-y-2">
            <label htmlFor="provider" className="text-sm font-medium">
              Provider
            </label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}

      {/* Voice Selection */}
      {/* <div className="space-y-2">
            <label htmlFor="voice" className="text-sm font-medium">
              Voice
            </label>
            <Select value={voice} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
      {/* </div> */}
      {/* </div> */}

      {/* Model Section */}
      {/* <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Model</h3>
        <p className="text-sm text-gray-600 mb-6">
          This is the model that will be used.
        </p>

        <div className="space-y-2">
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div> */}
    </div>
  );
}
