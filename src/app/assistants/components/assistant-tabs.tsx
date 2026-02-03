'use client';

import { useState, Suspense, useEffect } from 'react';
import {
  Bot,
  Terminal,
  Settings,
  Trash2,
  Save,
  Clock,
  DollarSign,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import { useAssistants } from '../../hooks/use-assistants-context';
import DeleteConfirmationModal from '../delete-confirmation-modal';

import ModelTab from './tab-views/model-tab';
import LiveKitAssistantDualButton from './livekit-assistant-dual-button';

// Placeholder for tabs not yet implemented
const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="p-6 text-center text-gray-500">
    <p>{title} tab content will be implemented later</p>
  </div>
);

interface AssistantTabsProps {
  editingAssistantId: string | null;
}

export default function AssistantTabs({ editingAssistantId }: AssistantTabsProps) {
  const { currentAssistant, saveAssistantUpdates, createAssistant, setCurrentAssistant } = useAssistants();
  const [activeTab, setActiveTab] = useState('model');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  // Reset unsaved changes flag when assistant changes
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [currentAssistant?.id]);

  // RBAC placeholder
  const canDeleteAssistant = true;

  if (!currentAssistant) {
    return (
      <div className="p-6 text-center text-gray-500">
        Select an assistant or create a new one to get started
      </div>
    );
  }

  const isDraft = currentAssistant.id.startsWith('local-');
  const isEditingName = editingAssistantId === currentAssistant.id;

  const isSaveDisabled = isSaving || isDraft || !hasUnsavedChanges;

  const handleMarkUnsavedChanges = () => {
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!currentAssistant || isDraft || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      const { id: _id, createdAt: _createdAt, knowledgeBase, ...restOfAssistant } = currentAssistant;
      const updatePayload = {
        ...restOfAssistant,
        knowledgeBaseId: knowledgeBase !== undefined ? knowledgeBase : null,
      };
      await saveAssistantUpdates(currentAssistant.id, updatePayload);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving assistant:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentAssistant || !isDraft) return;

    setIsSaving(true);
    try {
      const { id: localId, createdAt: _createdAt, knowledgeBase, ...restOfDraft } = currentAssistant;
      const createPayload = {
        ...restOfDraft,
        knowledgeBaseId: knowledgeBase !== undefined ? knowledgeBase : null,
      };

      const publishedAssistant = await createAssistant(localId, createPayload);
      if (publishedAssistant) {
        setJustPublished(true);
        setCurrentAssistant(publishedAssistant);
        setTimeout(() => setJustPublished(false), 1500);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error publishing assistant:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Compact header with metrics and actions */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
        {/* Compact metrics */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <DollarSign className="h-4 w-4" />
            <span>Cost: <span className="text-[var(--foreground)] font-medium">~₹{((currentAssistant.costPerMin || 0.11) * 0.85).toFixed(2)}/min</span></span>
          </div>
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Clock className="h-4 w-4" />
            <span>Latency: <span className="text-[var(--foreground)] font-medium">~{currentAssistant.latencyMs || 1800}ms</span></span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <LiveKitAssistantDualButton assistant={currentAssistant} />

          {canDeleteAssistant && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSaving}
              title={isDraft ? 'Delete this draft' : 'Delete assistant'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {isDraft ? (
            justPublished ? (
              <Button
                disabled
                size="sm"
                className="bg-green-600 text-white"
              >
                ✓ Published!
              </Button>
            ) : (
              <Button
                onClick={handlePublish}
                disabled={isSaving || isEditingName}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSaving ? 'Publishing...' : 'Publish'}
              </Button>
            )
          ) : (
            <Button
              onClick={handleSaveChanges}
              disabled={isSaveDisabled}
              size="sm"
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)]"
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Tab navigation - only Model, Functions, Advanced */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[var(--muted)] p-1 rounded-lg gap-1 mb-4">
          <TabsTrigger
            value="model"
            className="flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-sm"
          >
            <Bot className="h-4 w-4" />
            Model
          </TabsTrigger>
          <TabsTrigger
            value="functions"
            className="flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-sm"
          >
            <Terminal className="h-4 w-4" />
            Functions
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 px-4 py-2 rounded-md transition-all font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-sm"
          >
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="model" className="mt-0">
          <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
            <ModelTab onChangesMade={handleMarkUnsavedChanges} />
          </Suspense>
        </TabsContent>

        <TabsContent value="functions" className="mt-0">
          <PlaceholderTab title="Functions" />
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <PlaceholderTab title="Advanced" />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
