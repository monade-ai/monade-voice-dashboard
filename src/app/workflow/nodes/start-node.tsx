import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseNode } from './base-node';

/**
 * Start node in the workflow - the entry point
 */
export const StartNode = memo((props: NodeProps) => {
  const nodeData = {
    ...props.data,
    sourceHandle: 'out',
    targetHandle: null
  };
  
  return (
    <>
      <BaseNode {...props} data={nodeData} sourcePosition={Position.Bottom} />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="w-2 h-2 bg-blue-500"
      />
    </>
  );
});

StartNode.displayName = 'StartNode';