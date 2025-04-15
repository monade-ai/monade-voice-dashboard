import { Node, XYPosition } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';

import { PipecatNode, NodeProperties } from '../store/workflow-store';

/**
 * Creates a new node with the given type and position
 * @param nodeType The type of node to create
 * @param position The position of the node
 * @returns A new node
 */
export function createNodeFromType(nodeType: string, position: XYPosition): PipecatNode {
  let properties: NodeProperties;
  let label: string;
  
  // Set default properties based on node type
  switch (nodeType) {
  case 'startNode':
    label = 'Start';
    properties = {
      role_messages: [
        { role: 'system', content: 'Enter bot\'s personality/role...' },
      ],
      task_messages: [
        { role: 'system', content: 'Enter initial task...' },
      ],
      pre_actions: [],
      post_actions: [],
    };
    break;
      
  case 'flowNode':
    label = 'Flow Node';
    properties = {
      task_messages: [
        { role: 'system', content: 'Enter task message...' },
      ],
      pre_actions: [],
      post_actions: [],
    };
    break;
      
  case 'endNode':
    label = 'End Node';
    properties = {
      task_messages: [
        { role: 'system', content: 'Enter final task message...' },
      ],
      pre_actions: [],
      post_actions: [],
    };
    break;
      
  case 'functionNode':
    label = 'Function';
    properties = {
      task_messages: [
        { role: 'system', content: 'Function node' },
      ],
      function: {
        name: 'function_name',
        description: 'Function description',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      isNodeFunction: false,
    };
    break;
      
  case 'mergeNode':
    label = 'Merge';
    properties = {
      task_messages: [
        { role: 'system', content: 'Merge node' },
      ],
    };
    break;
      
  default:
    label = 'Unknown Node';
    properties = {
      task_messages: [
        { role: 'system', content: 'Unknown node type' },
      ],
    };
  }
  
  // Create the node with the defined properties
  return {
    id: uuidv4(),
    type: nodeType,
    position,
    data: {
      properties,
      label,
      nodeType,
    },
  };
}

/**
 * Clones an existing node
 * @param node The node to clone
 * @param newPosition Optional new position for the cloned node
 * @returns The cloned node
 */
export function cloneNode(node: PipecatNode, newPosition?: XYPosition): PipecatNode {
  const position = newPosition || {
    x: node.position.x + 50,
    y: node.position.y + 50,
  };
  
  return {
    ...node,
    id: uuidv4(),
    position,
    selected: false,
    data: {
      ...node.data,
      properties: JSON.parse(JSON.stringify(node.data.properties)),
    },
  };
}

/**
 * Determines if a node can have multiple input connections
 * @param nodeType The type of node
 * @returns True if the node can have multiple inputs
 */
export function canHaveMultipleInputs(nodeType: string): boolean {
  return nodeType === 'mergeNode' || nodeType === 'endNode';
}

/**
 * Determines if a node can have multiple output connections
 * @param nodeType The type of node
 * @returns True if the node can have multiple outputs
 */
export function canHaveMultipleOutputs(nodeType: string): boolean {
  return nodeType === 'startNode' || nodeType === 'flowNode';
}