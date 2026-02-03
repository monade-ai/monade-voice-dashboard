'use client';

import { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Toolbar } from '../toolbar';
import { SidePanel } from '../side-panel';
import { registerNodes } from '../nodes';
import { useWorkflowStore } from '../store/workflow-store';

/**
 * Main workflow editor component that integrates React Flow
 */
export function WorkflowEditor() {
  // Get custom node types (memoized)
  const nodeTypes = useMemo(() => registerNodes(), []);
  
  // Use our workflow store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeSelect,
    selectedNode,
    resetSelection,
  } = useWorkflowStore();

  // Reference to the React Flow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Event handler for selecting a node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeSelect(node);
  }, [onNodeSelect]);

  // Event handler for background click - reset selection
  const onPaneClick = useCallback(() => {
    resetSelection();
  }, [resetSelection]);

  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex">
        {/* Main Flow Editor */}
        <div ref={reactFlowWrapper} className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <Panel position="top-left" className="w-full bg-background border-b">
              <Toolbar />
            </Panel>
          </ReactFlow>
        </div>
        
        {/* Side Panel */}
        <SidePanel 
          selectedNode={selectedNode} 
          className="w-96 border-l bg-background overflow-y-auto" 
        />
      </div>
    </ReactFlowProvider>
  );
}
