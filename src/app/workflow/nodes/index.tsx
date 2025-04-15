import { NodeTypes } from 'reactflow';

import { StartNode } from './start-node';
import { FlowNode } from './flow-node';
import { EndNode } from './end-node';
import { FunctionNode } from './function-node';
import { MergeNode } from './merge-node';

/**
 * Register all custom node types for React Flow
 * @returns Object with node type mappings
 */
export function registerNodes(): NodeTypes {
  return {
    startNode: StartNode,
    flowNode: FlowNode,
    endNode: EndNode,
    functionNode: FunctionNode,
    mergeNode: MergeNode,
  };
}

export { StartNode, FlowNode, EndNode, FunctionNode, MergeNode };