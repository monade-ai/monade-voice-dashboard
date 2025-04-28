'use client';

import React from 'react';
import { Phone, MessageSquare, UploadCloud } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';

interface AssistantCardProps {
  assistant: Assistant;
  onSelect: (assistant: Assistant) => void;
}

export function AssistantCard({ assistant, onSelect }: AssistantCardProps) {
  const { createAssistant } = useAssistants();
  const [isPublishing, setIsPublishing] = React.useState(false);

  const isDraft = assistant.id.startsWith('local-');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const handlePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDraft) return;
    setIsPublishing(true);
    try {
      // Map assistant fields to CreateAssistantData
      await createAssistant(assistant.id, {
        name: assistant.name,
        phoneNumber: assistant.phoneNumber,
        description: assistant.description,
        model: assistant.model,
        provider: assistant.provider,
        voice: assistant.voice,
        costPerMin: assistant.costPerMin,
        latencyMs: assistant.latencyMs,
        tags: assistant.tags,
        knowledgeBaseId: assistant.knowledgeBase ?? undefined,
      });
    } catch (error) {
      console.error("Failed to publish assistant:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card
      className={`bg-white border border-gray-200 hover:border-amber-300 transition-all shadow-sm cursor-pointer ${isDraft ? 'border-dashed border-amber-500' : ''}`}
      onClick={() => onSelect(assistant)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <span
              className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
              aria-hidden="true"
            >
              <span
                className="absolute inset-0 animate-gradient-spin"
                style={{
                  background: "conic-gradient(from 0deg, #fbbf24, #06b6d4, #a78bfa, #fbbf24)",
                  filter: "blur(2px)",
                  opacity: 0.8,
                }}
              />
              <span className="absolute inset-1 rounded-full bg-white/80" />
            </span>
            <div>
              <h3 className="text-lg font-medium text-gray-800">{assistant.name}</h3>
              <p className="text-sm text-gray-500">{assistant.description || 'No description'}</p>
            </div>
          </div>
          {isDraft ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Draft
            </Badge>
          ) : (
            assistant.provider && (
              <Badge variant="secondary">{assistant.provider}</Badge>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Model</p>
              <p className="text-sm font-medium text-gray-800">{assistant.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cost/Min</p>
              <p className="text-sm font-medium text-gray-800">
                {formatCurrency(assistant.costPerMin || 0)}
              </p>
            </div>
          </div>

          {isDraft ? (
            <Button
              size="sm"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 mr-2" />
                Talk
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
