'use client';

import { useState, useEffect } from 'react';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useKnowledgeBase } from '@/app/hooks/use-knowledge-base';
import { useContactsContext } from '@/app/contacts/contexts/contacts-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText } from 'lucide-react';
import { fetchKnowledgeBaseContent } from '@/app/knowledge-base/api/knowldege-api';
import ContactBucketCarousel from '../contact-bucket-carousel';

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

// Define voice options by provider
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

  const [provider, setProvider] = useState(currentAssistant?.provider || 'openai');
  const [model, setModel] = useState(currentAssistant?.model || 'tts-1');
  const [voice, setVoice] = useState(currentAssistant?.voice || 'alloy');
  const [phoneNumber, setPhoneNumber] = useState(currentAssistant?.phoneNumber || '');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState(currentAssistant?.knowledgeBase || '');
  const [contactBucketId, setContactBucketId] = useState(currentAssistant?.contact_bucket_id || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [kbPreview, setKbPreview] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isEditorMaximized, setEditorMaximized] = useState(true);

  // Synchronize local state with currentAssistant when it changes
  useEffect(() => {
    setProvider(currentAssistant?.provider || 'openai');
    setModel(currentAssistant?.model || 'tts-1');
    setVoice(currentAssistant?.voice || 'alloy');
    setPhoneNumber(currentAssistant?.phoneNumber || '');
    setKnowledgeBaseId(currentAssistant?.knowledgeBase || '');
    setContactBucketId(currentAssistant?.contact_bucket_id || '');
  }, [currentAssistant]);

  // Simple phone number validation (only digits)
  const validatePhoneNumber = (number: string): boolean => {
    if (!number) return true; // Allow empty initially
    const phoneRegex = /^\d+$/; // Only digits, no length limit

    return phoneRegex.test(number);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);

    // Validate the number
    if (value && !validatePhoneNumber(value)) { // Check only if value is not empty
      setPhoneError('Invalid format. Please enter only numbers.');
    } else {
      setPhoneError(null); // Clear error if valid or empty
    }

    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { phoneNumber: value });
      onChangesMade(); // Mark changes
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
  const handleKnowledgeBaseChange = async (value: string) => {
    setKnowledgeBaseId(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { knowledgeBase: value });
      onChangesMade(); // Mark changes
    }

    if (value && !value.startsWith('text:')) {
      setIsLoadingPreview(true);
      const selectedKb = knowledgeBases.find(kb => kb.id === value);
      if (selectedKb) {
        try {
          const response = await fetch(selectedKb.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch preview: ${response.statusText}`);
          }
          const content = await response.text();
          setKbPreview(content);
        } catch (error) {
          console.error('Failed to fetch KB preview:', error);
          setKbPreview('Error loading preview.');
        } finally {
          setIsLoadingPreview(false);
        }
      }
    } else {
      setKbPreview('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Description Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Short Description</h3>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Enter assistant description"
            maxLength={30}
            value={currentAssistant?.description || ''}
            onChange={(e) => {
              if (currentAssistant) {
                updateAssistantLocally(currentAssistant.id, { description: e.target.value });
                onChangesMade();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="text-xs text-right text-gray-500">
            {currentAssistant?.description?.length || 0}/30
          </div>
        </div>
      </div>

      {/* Phone Number Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Phone Number</h3>
        <p className="text-sm text-gray-600 mb-6">
          Enter the phone number to associate with this assistant. This will be used for knowledge base mapping and call functionality.
        </p>
        <div className="space-y-2">
          <label htmlFor="assistant-phone-number" className="text-sm font-medium">
            Phone Number
          </label>
          <input
            id="assistant-phone-number"
            type="tel"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="e.g. 08047361640"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
          />
          {/* Display validation error */}
          {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
        </div>
      </div>

      {/* Script Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Script</h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide the script for this assistant. You can create a new one or select an existing one.
        </p>
        <div className="grid grid-cols-1 gap-6">
          {isEditorMaximized ? (
            <>
              {/* Create New Script */}
              <div className="border rounded-md p-4 bg-white shadow-sm">
                <div className="flex items-center mb-3">
                  <PlusCircle className="h-5 w-5 mr-2 text-blue-500" />
                  <h4 className="text-md font-semibold">Create New Script</h4>
                </div>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Type or paste script content here..."
                  rows={5}
                  value={knowledgeBaseId && knowledgeBaseId.startsWith('text:') ? knowledgeBaseId.replace(/^text:/, '') : ''}
                  onChange={(e) => {
                    const textValue = e.target.value;
                    setKnowledgeBaseId(`text:${textValue}`);
                    if (currentAssistant) {
                      updateAssistantLocally(currentAssistant.id, { knowledgeBase: `text:${textValue}` });
                      onChangesMade();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">This will be saved as a new script entry.</p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-md bg-white shadow-sm">
              <h4 className="text-md font-semibold">Create or Upload a Script</h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditorMaximized(true)}
                  className="bg-yellow-400 text-black font-bold hover:bg-yellow-500"
                >
                  Create Script
                </Button>
                <Button
                  variant="outline"
                  className="bg-yellow-400 text-black font-bold hover:bg-yellow-500"
                >
                  Upload Script
                </Button>
              </div>
            </div>
          )}

          {/* Select Existing Script */}
          <div className="border rounded-md p-4 bg-white shadow-sm">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 mr-2 text-green-500" />
              <h4 className="text-md font-semibold">Use Existing Script</h4>
            </div>
            <Select
              value={knowledgeBaseId}
              onValueChange={handleKnowledgeBaseChange}
              onOpenChange={(isOpen) => {
                if (isOpen) {
                  setEditorMaximized(false);
                }
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder={knowledgeBases.length === 0 ? 'No Scripts found' : 'Select script'} />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases.length === 0 ? (
                  <SelectItem value="none" disabled>No scripts available</SelectItem>
                ) : (
                  knowledgeBases.map((kb) => (
                    <SelectItem key={kb.id} value={kb.id}>
                      {kb.filename}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {knowledgeBaseId && !knowledgeBaseId.startsWith('text:') && (
              <div className="mt-3 p-2 border rounded bg-gray-50 text-sm text-gray-700 h-32 overflow-y-auto">
                <strong>Preview:</strong>
                {isLoadingPreview ? (
                  <p className="mt-1">Loading preview...</p>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap">{kbPreview}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Bucket Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Contact Bucket</h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the contact bucket to associate with this assistant. This will be used for contact-related features.
        </p>
        <ContactBucketCarousel
          buckets={buckets}
          selectedBucketId={contactBucketId}
          onSelectBucket={(bucketId) => {
            setContactBucketId(bucketId || '');
            if (currentAssistant) {
              updateAssistantLocally(currentAssistant.id, { contact_bucket_id: bucketId });
              onChangesMade();
            }
          }}
        />
      </div>


    </div>
  );
}
