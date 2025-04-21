import { useState, useCallback, useEffect } from 'react';
import { Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PipecatNode, useWorkflowStore, NodeProperties } from './store/workflow-store';
import { MessageEditor } from './editors/message-editor';
import { FunctionEditor } from './editors/function-editor';
import { ActionEditor } from './editors/action-editor';



interface SidePanelProps {
  selectedNode: PipecatNode | null;
  className?: string;
}

/**
 * Side panel component for editing node properties
 * Enhanced to match the functionality of the original Pipecat editor
 */
export function SidePanel({ selectedNode, className }: SidePanelProps) {
  const { updateNodeProperties } = useWorkflowStore();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editedProperties, setEditedProperties] = useState<NodeProperties | null>(null);

  // Track which editors have unsaved changes
  const [unsavedEditors, setUnsavedEditors] = useState<Set<string>>(new Set());

  // Initialize edited properties from selected node
  useEffect(() => {
    if (selectedNode) {
      setEditedProperties(JSON.parse(JSON.stringify(selectedNode.data.properties)));
    } else {
      setEditedProperties(null);
    }
    setHasUnsavedChanges(false);
    setUnsavedEditors(new Set());
  }, [selectedNode]);

  // Handle saving all editor changes
  const handleSaveAll = useCallback(() => {
    if (selectedNode && editedProperties) {
      updateNodeProperties(selectedNode.id, editedProperties);
      setHasUnsavedChanges(false);
      setUnsavedEditors(new Set());
    }
  }, [selectedNode, editedProperties, updateNodeProperties]);

  // Handle canceling all changes
  const handleCancelAll = useCallback(() => {
    if (selectedNode) {
      setEditedProperties(JSON.parse(JSON.stringify(selectedNode.data.properties)));
      setHasUnsavedChanges(false);
      setUnsavedEditors(new Set());
    }
  }, [selectedNode]);

  // Handle a property update from an editor
  const updateProperty = useCallback((key: string, value: any) => {
    setEditedProperties(prev => {
      if (!prev) return null;
      
      // Check if the value actually changed
      const currentValue = JSON.stringify(prev[key as keyof NodeProperties]);
      const newValue = JSON.stringify(value);
      
      if (currentValue === newValue) {
        // No change, remove from unsaved editors
        setUnsavedEditors(prev => {
          const next = new Set(prev);
          next.delete(key);
          setHasUnsavedChanges(next.size > 0);

          return next;
        });
      } else {
        // Value changed, add to unsaved editors
        setUnsavedEditors(prev => {
          const next = new Set(prev);
          next.add(key);
          setHasUnsavedChanges(true);

          return next;
        });
      }
      
      return {
        ...prev,
        [key]: value,
      };
    });
  }, []);

  // Handle keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's' && hasUnsavedChanges) {
        e.preventDefault();
        handleSaveAll();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSaveAll]);

  // Check for unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';

        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {selectedNode && editedProperties ? (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-bold">Edit {selectedNode.data.label}</h2>
            {hasUnsavedChanges && (
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={handleCancelAll}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveAll}>
                  <Save className="h-4 w-4 mr-1" />
                  Save Changes ({unsavedEditors.size})
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode.type === 'functionNode' ? (
              <FunctionEditor 
                function={editedProperties.function} 
                onChange={(func) => updateProperty('function', func)}
              />
            ) : (
              <div className="space-y-6">
                {/* Role Messages (only for Start Node) */}
                {selectedNode.type === 'startNode' && (
                  <MessageEditor
                    title="Role Messages"
                    description="Define the bot's personality and role"
                    messages={editedProperties.role_messages || []}
                    onChange={(messages) => updateProperty('role_messages', messages)}
                  />
                )}
                
                {/* Task Messages */}
                <MessageEditor
                  title="Task Messages"
                  description="Define the node's task"
                  messages={editedProperties.task_messages}
                  onChange={(messages) => updateProperty('task_messages', messages)}
                />
                
                {/* Pre-actions */}
                <ActionEditor
                  title="Pre-actions"
                  description="Actions to execute before node processing"
                  actions={editedProperties.pre_actions || []}
                  onChange={(actions) => updateProperty('pre_actions', actions)}
                />
                
                {/* Post-actions */}
                <ActionEditor
                  title="Post-actions"
                  description="Actions to execute after node processing"
                  actions={editedProperties.post_actions || []}
                  onChange={(actions) => updateProperty('post_actions', actions)}
                />
              </div>
            )}
          </div>
          
          {hasUnsavedChanges && (
            <div className="p-3 bg-muted border-t flex justify-between items-center">
              <span className="text-sm">Unsaved changes in {unsavedEditors.size} editor(s)</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={handleCancelAll}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveAll}>
                  Save All Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center p-4 text-center text-gray-500">
          <p>Select a node to edit its properties</p>
        </div>
      )}
    </div>
  );
}