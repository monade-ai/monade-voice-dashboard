import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

import { formatActions } from '../utils/helpers';
import { Message, Action, PipecatNode } from '../store/workflow-store';

/**
 * Base node component with common styling and content rendering
 */
export const BaseNode = memo(({ 
  data, 
  selected, 
  id, 
  type, 
  sourcePosition = Position.Bottom, 
  targetPosition = Position.Top, 
}: NodeProps & { 
  sourcePosition?: Position; 
  targetPosition?: Position;
}) => {
  const { properties, label } = data;
  
  // Colors for different node types
  const getBackgroundColor = () => {
    switch (type) {
    case 'startNode': return 'bg-green-400';
    case 'flowNode': return 'bg-blue-400';
    case 'endNode': return 'bg-red-400';
    case 'functionNode': return data.properties.isNodeFunction ? 'bg-orange-400' : 'bg-purple-400';
    case 'mergeNode': return 'bg-gray-400';
    default: return 'bg-slate-400';
    }
  };

  /**
   * Renders a message section with label
   */
  const renderMessage = (message: Message, label: string, index: number) => (
    <div key={`${label}-${index}`} className="mb-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-mono bg-gray-800 p-2 rounded">
        {message.content}
      </div>
    </div>
  );

  /**
   * Renders actions section
   */
  const renderActions = (actions: Action[], label: string) => {
    if (!actions || actions.length === 0) return null;
    
    return (
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">{label}</div>
        <div className="text-sm font-mono bg-gray-800 p-2 rounded">
          {formatActions(actions)}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`rounded shadow p-3 min-w-80 max-w-96 ${getBackgroundColor()} ${selected ? 'ring-2 ring-white' : ''}`}
    >
      <div className="font-bold text-white mb-2">{label}</div>
      
      <div className="text-white text-sm overflow-y-auto max-h-60">
        {/* Role Messages */}
        {properties.role_messages?.map((msg: Message, i: number) => 
          renderMessage(msg, 'Role Message', i),
        )}
        
        {/* Task Messages */}
        {properties.task_messages?.map((msg: Message, i: number) => 
          renderMessage(msg, 'Task Message', i),
        )}
        
        {/* Pre-actions */}
        {renderActions(properties.pre_actions || [], 'Pre-actions')}
        
        {/* Post-actions */}
        {renderActions(properties.post_actions || [], 'Post-actions')}
      </div>
      
      {/* Connection handles are conditionally rendered by child components */}
      {data.sourceHandle && (
        <Handle
          type="source"
          position={sourcePosition}
          id={data.sourceHandle}
          className="w-2 h-2 bg-blue-500"
        />
      )}
      
      {data.targetHandle && (
        <Handle
          type="target"
          position={targetPosition}
          id={data.targetHandle}
          className="w-2 h-2 bg-blue-500"
        />
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';