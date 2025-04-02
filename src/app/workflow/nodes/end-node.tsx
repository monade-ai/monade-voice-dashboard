import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

/**
 * End node - the terminal node in the workflow
 */
export const EndNode = memo((props: NodeProps) => {
  const nodeData = {
    ...props.data,
    sourceHandle: null,
    targetHandle: 'in'
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
    </>
  );
});

EndNode.displayName = 'EndNode';