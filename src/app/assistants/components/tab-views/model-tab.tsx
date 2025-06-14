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
  const handleKnowledgeBaseChange = (value: string) => {
    setKnowledgeBaseId(value);
    if (currentAssistant) {
      updateAssistantLocally(currentAssistant.id, { knowledgeBase: value });
      onChangesMade(); // Mark changes
    }
  };

  return (
    <div className="space-y-8">
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
              <SelectValue placeholder={knowledgeBases.length === 0 ? "No KBs found" : "Select knowledge base"} />
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
            value={contactBucketId || "none"}
            onValueChange={(value) => {
              const bucketId = value === "none" ? null : value;
              setContactBucketId(bucketId);
              if (currentAssistant) {
                updateAssistantLocally(currentAssistant.id, { contact_bucket_id: bucketId });
                onChangesMade();
              }
            }}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder={buckets.length === 0 ? "No buckets found" : "Select contact bucket"} />
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
