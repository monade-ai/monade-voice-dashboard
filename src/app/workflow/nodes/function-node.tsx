import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { FunctionDefinition } from '../store/workflow-store';

/**
 * Function node - represents a function in the workflow
 */
export const FunctionNode = memo((props: NodeProps) => {
  const { data, selected } = props;
  const functionData = data.properties.function as FunctionDefinition;
  const isNodeFunction = data.properties.isNodeFunction;
  
  // Background color based on function type
  const bgColor = isNodeFunction ? 'bg-orange-600' : 'bg-purple-600';
  
  // Check if there are parameters
  const hasParameters = functionData?.parameters?.properties && 
    Object.keys(functionData.parameters.properties).length > 0;
  
  return (
    <div className={`rounded shadow ${bgColor} p-3 min-w-64 max-w-80 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="text-xs text-gray-300 mb-1">
        {isNodeFunction ? '[Node Function]' : '[Edge Function]'}
      </div>
      
      <div className="font-bold text-white mb-2">
        {functionData?.name || 'Function'}
      </div>
      
      <div className="text-sm text-white mb-3">
        {functionData?.description || 'No description'}
      </div>
      
      {hasParameters && (
        <div className="text-xs text-gray-300 mb-1">
          Has Parameters ⚙️
        </div>
      )}
      
      {functionData?.transition_to && (
        <div className="text-xs text-gray-300">
          → {functionData.transition_to}
        </div>
      )}
      
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
    </div>
  );
});

FunctionNode.displayName = 'FunctionNode';