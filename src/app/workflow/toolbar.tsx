import { useCallback, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  File, 
  ZoomIn, 
  ZoomOut, 
  Plus 
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { useState } from 'react';
import { useWorkflowStore } from './store/workflow-store';
import { validateFlow } from './utils/validation';
import { createNodeFromType } from './utils/node-utils';

/**
 * Toolbar component with flow actions (new, import, export, zoom)
 */
export function Toolbar() {
  const reactFlowInstance = useReactFlow();
  const { clearGraph, importFlow, exportFlow } = useWorkflowStore();
  const [newFlowDialogOpen, setNewFlowDialogOpen] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle creating a new flow
  const handleNew = useCallback(() => {
    setNewFlowDialogOpen(false);
    clearGraph();
  }, [clearGraph]);

  // Handle importing a flow
  const handleImport = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle file selection for import
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) return;
        
        // Clean the input string
        const cleanInput = (event.target.result as string)
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');

        const flowConfig = JSON.parse(cleanInput);
        
        // Validate imported flow
        const validation = validateFlow(flowConfig);
        if (!validation.valid) {
          console.error('Flow validation errors:', validation.errors);
          setImportErrorMessage(`Import validation failed: ${validation.errors.join(', ')}`);
          return;
        }

        importFlow(flowConfig);
        console.log('Successfully imported flow configuration');
      } catch (error) {
        console.error('Error importing flow:', error);
        setImportErrorMessage(`Error importing flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, [importFlow]);

  // Handle exporting a flow
  const handleExport = useCallback(() => {
    try {
      const flowConfig = exportFlow();
      
      // Validate before export
      const validation = validateFlow(flowConfig);
      if (!validation.valid) {
        console.error('Flow validation errors:', validation.errors);
        if (!confirm('Flow has validation errors. Export anyway?')) {
          return;
        }
      }

      // Generate timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, -5);

      // Create a clean JSON string
      const jsonString = JSON.stringify(flowConfig, null, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flow_config_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating flow configuration:', error);
      alert('Error generating flow configuration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [exportFlow]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  // Add new nodes
  const addNode = useCallback((type: string) => {
    const position = reactFlowInstance.project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });
    
    const newNode = createNodeFromType(type, position);
    reactFlowInstance.addNodes(newNode);
  }, [reactFlowInstance]);

  return (
    <div className="w-full flex justify-between items-center p-2">
      <div className="space-x-2">
        <Button onClick={() => setNewFlowDialogOpen(true)} variant="outline" size="sm">
          <File className="h-4 w-4 mr-1" />
          New
        </Button>
        <Button onClick={handleImport} variant="outline" size="sm">
          <ArrowDownToLine className="h-4 w-4 mr-1" />
          Import
        </Button>
        <Button onClick={handleExport} variant="outline" size="sm">
          <ArrowUpFromLine className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
      
      <div className="font-semibold text-center">Workflow Editor</div>
      
      <div className="space-x-2">
        <div className="inline-flex gap-1">
          <Button onClick={handleZoomIn} variant="outline" size="sm" id="zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleZoomOut} variant="outline" size="sm" id="zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="inline-flex gap-1 ml-4">
          <Button onClick={() => addNode('startNode')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Start
          </Button>
          <Button onClick={() => addNode('flowNode')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Flow
          </Button>
          <Button onClick={() => addNode('endNode')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            End
          </Button>
          <Button onClick={() => addNode('functionNode')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Function
          </Button>
          <Button onClick={() => addNode('mergeNode')} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Merge
          </Button>
        </div>
      </div>
      
      {/* Hidden file input for import */}
      <input 
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".json"
        onChange={handleFileChange}
      />
      
      {/* New Flow Dialog */}
      <Dialog open={newFlowDialogOpen} onOpenChange={setNewFlowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Flow</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will clear the current workflow. Any unsaved changes will be lost.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFlowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNew}>
              Create New Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )}