import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { BaseNode } from './base-node';

/**
 * Flow node - an intermediate node in the workflow
 */
export const FlowNode = memo((props: NodeProps) => {
  const nodeData = {
    ...props.data,
    sourceHandle: 'out',
    targetHandle: 'in',
  };
  
  return (
    <>
      <BaseNode {...props} data={nodeData} />
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        className="w-2 h-2 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="w-2 h-2 bg-blue-500"
      />
    </>
  );
});

FlowNode.displayName = 'FlowNode';