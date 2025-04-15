import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Action } from '../store/workflow-store';

import { JsonEditor } from './json-editor';

interface ActionEditorProps {
  title: string;
  description: string;
  actions: Action[];
  onChange: (actions: Action[]) => void;
}

/**
 * Component for editing action arrays (pre or post actions)
 * Uses JSON editor similar to the original Pipecat editor
 */
export function ActionEditor({ title, description, actions, onChange }: ActionEditorProps) {
  // Validate actions array structure
  const validateActions = (json: any): boolean => {
    if (!Array.isArray(json)) {
      return false;
    }
    
    return json.every(action => 
      typeof action === 'object' && 
      action !== null &&
      typeof action.type === 'string',
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <JsonEditor
          value={actions}
          onChange={onChange}
          validator={validateActions}
          title={title}
          description="Edit JSON array of action objects with at least a 'type' field"
          minHeight="150px"
        />
      </CardContent>
    </Card>
  );
}