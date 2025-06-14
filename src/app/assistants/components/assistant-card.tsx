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
      className={`bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] transition-all shadow-sm cursor-pointer ${isDraft ? 'border-dashed border-[var(--primary)]' : ''}`}
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
                  background: "conic-gradient(from 0deg, var(--primary), var(--accent), var(--secondary), var(--primary))",
                  filter: "blur(2px)",
                  opacity: 0.8,
                }}
              />
              <span className="absolute inset-1 rounded-full bg-[var(--card)]/80" />
            </span>
            <div>
              <h3 className="text-lg font-medium text-[var(--foreground)]">{assistant.name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{assistant.description || 'No description'}</p>
            </div>
          </div>
          {isDraft ? (
            <Badge variant="outline" className="border-[var(--primary)] text-[var(--primary)]">
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
              <p className="text-sm text-[var(--muted-foreground)]">Model</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{assistant.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Cost/Min</p>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {formatCurrency(assistant.costPerMin || 0)}
              </p>
            </div>
          </div>

          {isDraft ? (
            <Button
              size="sm"
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)]"
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
                className="flex-1 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
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
