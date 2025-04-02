import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
} from 'reactflow';
import { generateFlowConfig } from '../utils/export';
import { createFlowFromConfig } from '../utils/import';

/**
 * Type definition for node properties from the original Pipecat implementation
 */
export interface NodeProperties {
  role_messages?: Array<Message>;
  task_messages: Array<Message>;
  pre_actions?: Array<Action>;
  post_actions?: Array<Action>;
  function?: FunctionDefinition;
  isNodeFunction?: boolean;
}

/**
 * Message type definition
 */
export interface Message {
  role: string;
  content: string;
}

/**
 * Action type definition
 */
export interface Action {
  type: string;
  text?: string;
  [key: string]: any;
}

/**
 * Function definition type
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  transition_to?: string;
  handler?: string;
}

/**
 * Extended Node type with Pipecat-specific properties
 */
export interface PipecatNode extends Node {
  data: {
    properties: NodeProperties;
    label: string;
    nodeType: string;
  };
}

/**
 * Workflow store state interface
 */
interface WorkflowState {
  nodes: PipecatNode[];
  edges: Edge[];
  selectedNode: PipecatNode | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeSelect: (node: PipecatNode) => void;
  resetSelection: () => void;
  updateNodeProperties: (nodeId: string, properties: NodeProperties) => void;
  clearGraph: () => void;
  importFlow: (flowConfig: any) => void;
  exportFlow: () => any;
}

/**
 * Create the workflow store using zustand
 */
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  // Handle node changes
  onNodesChange: (changes: NodeChange[]) => {
    set(state => ({
      nodes: applyNodeChanges(changes, state.nodes) as PipecatNode[],
    }));
  },

  // Handle edge changes
  onEdgesChange: (changes: EdgeChange[]) => {
    set(state => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  // Connect nodes
  onConnect: (connection: Connection) => {
    set(state => ({
      edges: addEdge({
        ...connection,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }, state.edges),
    }));
  },

  // Select a node
  onNodeSelect: (node: PipecatNode) => {
    set({ selectedNode: node });
  },

  // Reset node selection
  resetSelection: () => {
    set({ selectedNode: null });
  },

  // Update node properties
  updateNodeProperties: (nodeId: string, properties: NodeProperties) => {
    set(state => ({
      nodes: state.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              properties: properties
            }
          };
        }
        return node;
      }),
    }));
  },

  // Clear the graph
  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null
    });
  },

  // Import flow from configuration
  importFlow: (flowConfig: any) => {
    try {
      const { nodes, edges } = createFlowFromConfig(flowConfig);
      set({
        nodes: nodes as PipecatNode[],
        edges,
        selectedNode: null
      });
    } catch (error) {
      console.error('Error importing flow:', error);
    }
  },

  // Export flow to configuration
  exportFlow: () => {
    try {
      const { nodes, edges } = get();
      return generateFlowConfig(nodes, edges);
    } catch (error) {
      console.error('Error exporting flow:', error);
      return null;
    }
  }
}));