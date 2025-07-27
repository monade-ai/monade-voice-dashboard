'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import {
  Bot,
  Mic,
  Settings,
  Terminal,
  Volume2,
  Trash2,
  Calendar,
  BarChart3,
  InfoIcon,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import { useAssistants } from '../../hooks/use-assistants-context';
import DeleteConfirmationModal from '../delete-confirmation-modal';

import CostDisplay from './cost-display';
import ModelTab from './tab-views/model-tab';
import AssistantDualButton from './assistant-dual-button';
import { useHasPermission } from '@/lib/auth/useHasPermission';

import CallScheduling from './tab-views/call-management/call-scheduling';
import CallInsights from './tab-views/call-management/call-insights';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Modern, animated latency card
function LatencyCard({ latencyMs }: { latencyMs: number }) {
  // Animate the latency value on change
  const [displayLatency, setDisplayLatency] = useState(latencyMs);
  const prevLatency = useRef(latencyMs);

  useEffect(() => {
    if (latencyMs !== prevLatency.current) {
      let frame: number;
      const start = prevLatency.current;
      const end = latencyMs;
      const duration = 400;
      const startTime = performance.now();

      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setDisplayLatency(start + (end - start) * progress);
        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          prevLatency.current = end;
        }
      }
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [latencyMs]);

  // Bar width and color based on latency
  const barWidth = Math.min(100, Math.max(10, (latencyMs / 2000) * 100));
  const barColor = "bg-[#3A8DFF]";

  return (
    <div className="relative w-full p-4 bg-[#F5F6FA] rounded-xl border border-[#E5E5E0] shadow-md transition-transform duration-200 hover:scale-[1.025] hover:shadow-lg group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-[#181A1B] font-semibold tracking-wide uppercase text-xs">
            Latency
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-[#D18EE2] group-hover:text-[#FF7759] transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Estimated average response latency in milliseconds</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="w-full text-center">
        <div
          className="font-extrabold text-4xl text-[#181A1B] transition-all duration-300"
          style={{ letterSpacing: "0.01em" }}
        >
          ~{Math.round(displayLatency)}
          <span className="text-lg text-[#39594D] font-medium ml-1">ms</span>
        </div>
      </div>
      {/* Animated visual latency indicator */}
      <div className="mt-4 h-2 w-full bg-[#E5E5E0] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${barColor}`}
          style={{
            width: `${barWidth}%`,
            minWidth: "10%",
            boxShadow: "0 0 8px 0 rgba(255,119,89,0.18)",
          }}
        ></div>
      </div>
    </div>
  );
}

// Placeholder for tabs not yet implemented
const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="p-8 text-center text-gray-500">
    <p>{title} tab content will be implemented later</p>
  </div>
);

interface AssistantTabsProps {
  editingAssistantId: string | null;
}

export default function AssistantTabs({ editingAssistantId }: AssistantTabsProps) {
  const { currentAssistant, saveAssistantUpdates, fetchAssistants, createAssistant, setCurrentAssistant } = useAssistants();
  const [activeTab, setActiveTab] = useState('model');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  // Reset unsaved changes flag when assistant changes
  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [currentAssistant?.id]);

  // RBAC
  const canDeleteAssistant = useHasPermission('assistants.delete');

  if (!currentAssistant) {
    return (
      <div className="p-8 text-center text-gray-500">
        Select an assistant or create a new one to get started
      </div>
    );
  }

  // Add console log here to check the state
  console.log('[AssistantTabs] Checking phone number for save button:', currentAssistant.id, currentAssistant.phoneNumber);

  const isDraft = currentAssistant.id.startsWith('local-');
  const isEditingName = editingAssistantId === currentAssistant.id;

  // Determine if save should be disabled
  const isSaveDisabled =
    isSaving ||
    isDraft ||
    !currentAssistant.phoneNumber ||
    currentAssistant.phoneNumber.trim() === '' ||
    !hasUnsavedChanges; // Disable if no unsaved changes

  const handleMarkUnsavedChanges = () => {
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!currentAssistant || isDraft || !currentAssistant.phoneNumber || currentAssistant.phoneNumber.trim() === '' || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      if (isDraft) {
        console.warn('Attempted to save changes on a draft assistant. Use publish instead.');
      } else {
        // Construct the payload explicitly matching UpdateAssistantData
        const { id, createdAt, knowledgeBase, ...restOfAssistant } = currentAssistant;
        const updatePayload /*: UpdateAssistantData */ = {
          ...restOfAssistant, // Include other updatable fields
          // Assign the value from knowledgeBase (which should be the ID string) to knowledgeBaseId
          knowledgeBaseId: knowledgeBase !== undefined ? knowledgeBase : null, // Pass null if undefined
        };

        // Pass the correctly structured payload
        await saveAssistantUpdates(currentAssistant.id, updatePayload);
        setHasUnsavedChanges(false); // Reset flag on successful save
      }
    } catch (error) {
      console.error('Error saving assistant:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to reset local changes (may need context enhancement for full revert)
  const handleResetChanges = async () => {
    // TODO: Ideally, trigger a refetch or revert state in context to last saved state
    // For now, just reset the flag and potentially refetch assistants
    // if updateAssistantLocally modified the context state directly.
    // This might require knowing the original state before edits.
    if (currentAssistant && !isDraft) {
      // Example: Refetch all assistants to reset the current one
      // await fetchAssistants(); // Uncomment if fetchAssistants is available and appropriate
    }
    setHasUnsavedChanges(false);
    console.log('Changes reset (flag only for now).');
    // If ModelTab holds its own state not derived from context, need a way to reset it too.
  };

  // Function to publish a draft assistant using createAssistant
  const handlePublish = async () => {
    if (!currentAssistant || !isDraft || !currentAssistant.phoneNumber || currentAssistant.phoneNumber.trim() === '') return;

    setIsSaving(true); // Use isSaving state to indicate processing
    try {
      // Prepare payload for CreateAssistantData: remove id, createdAt, potentially map knowledgeBase
      const { id: localId, createdAt, knowledgeBase, ...restOfDraft } = currentAssistant;
      const createPayload /*: CreateAssistantData */ = {
        ...restOfDraft,
        // Ensure knowledgeBaseId is handled correctly - assuming context expects the ID string
        knowledgeBaseId: knowledgeBase !== undefined ? knowledgeBase : null, // Pass null if undefined
        // Ensure other required fields for CreateAssistantData are present
      };

      // Call createAssistant with the local draft ID and the prepared data
      const publishedAssistant = await createAssistant(localId, createPayload);
      if (publishedAssistant) {
        setJustPublished(true);
        setCurrentAssistant(publishedAssistant);
        setTimeout(() => {
          setJustPublished(false);
        }, 1500);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error publishing assistant:', error);
      // Handle error state if needed
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics display (Cost and Latency) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CostDisplay costPerMinute={currentAssistant.costPerMin || 0.11} />
        <LatencyCard latencyMs={currentAssistant.latencyMs || 1800} />
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative flex items-center">
          <TabsList className="flex bg-[var(--muted)] p-1 rounded-full shadow-sm gap-1 relative overflow-x-auto">
            <TabsTrigger
              value="model"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Bot className="h-4 w-4" />
              Model
            </TabsTrigger>
            <TabsTrigger
              value="transcriber"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Mic className="h-4 w-4" />
              Transcriber
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Volume2 className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger
              value="functions"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Terminal className="h-4 w-4" />
              Functions
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger
              value="scheduling"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Calendar className="h-4 w-4" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-[var(--muted-foreground)] data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <BarChart3 className="h-4 w-4" />
              Insights
            </TabsTrigger>
            {/* Animated active tab indicator */}
            {/* Blue underline removed as per new design */}
          </TabsList>
          {/* Move test call dual button next to tabs */}
          <div className="ml-4 flex-shrink-0">
            <AssistantDualButton assistant={currentAssistant} />
          </div>
        </div>

        {/* Tab contents with Suspense for each tab */}
        <TabsContent value="model" className="mt-6">
          <Suspense fallback={<div className="p-4 text-center">Loading model options...</div>}>
            <ModelTab onChangesMade={handleMarkUnsavedChanges} />
          </Suspense>
        </TabsContent>

        <TabsContent value="transcriber" className="mt-6">
          <PlaceholderTab title="Transcriber" />
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <PlaceholderTab title="Voice" />
        </TabsContent>

        <TabsContent value="functions" className="mt-6">
          <PlaceholderTab title="Functions" />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <PlaceholderTab title="Advanced" />
        </TabsContent>

        <TabsContent value="scheduling" className="mt-6">
          <CallScheduling />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <CallInsights />
        </TabsContent>

        <TabsContent value="analysis" className="mt-6">
          <PlaceholderTab title="Analysis" />
        </TabsContent>
      </Tabs>

      {/* Action Buttons: Delete, Reset, Save */}
      <div className="flex justify-end space-x-2 pt-4 border-t border-[var(--border)] mt-6">
        {/* Delete Button - Only for users with permission */}
        {canDeleteAssistant && (
          <Button
            variant="destructive"
            className="text-[var(--destructive)] border-[var(--destructive)] hover:bg-[var(--destructive)]/10"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isSaving} // Only disable during save
            title={isDraft ? "Delete this draft assistant" : "Delete this assistant"}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Assistant
          </Button>
        )}
        {/* Reset Button */}
        <Button
          variant="outline"
          className="border-[var(--border)]"
          onClick={handleResetChanges}
          disabled={!hasUnsavedChanges || isSaving || isDraft}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset Changes
        </Button>
        {/* Conditionally render Save or Publish Button */}
        {isDraft ? (
          justPublished ? (
            <Button
              disabled
              className="bg-green-600 text-white opacity-80 cursor-default"
              title="Assistant published!"
            >
              &#10003; Published!
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={isSaving || !currentAssistant.phoneNumber || currentAssistant.phoneNumber.trim() === '' || isEditingName}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                isEditingName
                  ? "Finish editing the assistant name before publishing"
                  : (!currentAssistant.phoneNumber || currentAssistant.phoneNumber.trim() === '')
                    ? "Phone number is required before publishing"
                    : "Publish this draft assistant"
              }
            >
              {isSaving ? 'Publishing...' : 'Publish Assistant'}
            </Button>
          )
        ) : (
          <Button
            onClick={handleSaveChanges}
            disabled={isSaveDisabled}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              isDraft ? "(Should not happen - Save button shown for non-drafts)" : // Adjusted title logic slightly
                (!currentAssistant.phoneNumber || currentAssistant.phoneNumber.trim() === '') ? "Phone number is required before saving changes" :
                  !hasUnsavedChanges ? "No changes to save" :
                    "Save changes to this assistant"
            }
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}

        {/* Delete confirmation modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      </div>
    </div>
  );
}
