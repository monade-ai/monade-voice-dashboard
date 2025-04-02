import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

/**
 * Merge node - combines multiple inputs into a single output
 */
export const MergeNode = memo((props: NodeProps) => {
  const { data, selected } = props;
  const inputCount = data.inputCount || 2;
  
  // Generate dynamic input handles
  const renderInputHandles = () => {
    const handles = [];
    
    for (let i = 0; i < inputCount; i++) {
      // Calculate position along the top edge
      const position = {
        left: `${((i + 1) / (inputCount + 1)) * 100}%`
      };
      
      handles.push(
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Top}
          id={`in-${i}`}
          style={position}
          className="w-2 h-2 bg-blue-500 absolute"
        />
      );
    }
    
    return handles;
  };
  
  return (
    <div className={`rounded shadow bg-gray-600 py-3 px-4 min-w-40 ${selected ? 'ring-2 ring-white' : ''}`}>
      <div className="font-bold text-white text-center mb-1">
        Merge
      </div>
      
      <div className="text-xs text-gray-300 text-center">
        {inputCount} Inputs
      </div>
      
      {renderInputHandles()}
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className="w-2 h-2 bg-blue-500"
      />
    </div>
  );
});

MergeNode.displayName = 'MergeNode';