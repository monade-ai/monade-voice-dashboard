'use client';

import { useState } from 'react';
import { useAssistants } from '@/app/hooks/use-assistants-context';
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

export default function ModelTab() {
  const { currentAssistant, updateAssistant } = useAssistants();
  
  const [provider, setProvider] = useState(currentAssistant?.provider || 'openai');
  const [model, setModel] = useState(currentAssistant?.model || 'tts-1');
  const [voice, setVoice] = useState(currentAssistant?.voice || 'alloy');

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
    
    updateAssistant(currentAssistant?.id || '', {
      provider: value,
      model: firstModel,
      voice: firstVoice,
    });
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    updateAssistant(currentAssistant?.id || '', { model: value });
  };

  const handleVoiceChange = (value: string) => {
    setVoice(value);
    updateAssistant(currentAssistant?.id || '', { voice: value });
  };

  return (
    <div className="space-y-8">
      {/* Voice Configuration Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-medium mb-2">Voice Configuration</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose from the list of voices, or sync your voice library if you aren't able to find your voice in the dropdown. 
          If you are still facing any error, you can enable custom voice and add a voice ID manually.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Provider Selection */}
          <div className="space-y-2">
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
          </div>
          
          {/* Voice Selection */}
          <div className="space-y-2">
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
          </div>
        </div>
      </div>
      
      {/* Model Section */}
      <div className="border rounded-lg p-6 bg-gray-50">
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
      </div>
    </div>
  );
}