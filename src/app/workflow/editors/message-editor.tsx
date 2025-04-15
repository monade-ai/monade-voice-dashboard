import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Message } from '../store/workflow-store';

import { JsonEditor } from './json-editor';

interface MessageEditorProps {
  title: string;
  description: string;
  messages: Message[];
  onChange: (messages: Message[]) => void;
}

/**
 * Component for editing message arrays (role or task messages)
 * Uses JSON editor similar to the original Pipecat editor
 */
export function MessageEditor({ title, description, messages, onChange }: MessageEditorProps) {
  // Validate messages array structure
  const validateMessages = (json: any): boolean => {
    if (!Array.isArray(json)) {
      return false;
    }
    
    return json.every(message => 
      typeof message === 'object' && 
      message !== null &&
      typeof message.role === 'string' && 
      typeof message.content === 'string',
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
          value={messages}
          onChange={onChange}
          validator={validateMessages}
          title={title}
          description="Edit JSON array of message objects with 'role' and 'content' fields"
          minHeight="150px"
        />
      </CardContent>
    </Card>
  );
}