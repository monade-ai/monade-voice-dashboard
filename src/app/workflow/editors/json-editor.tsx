import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
  validator?: (json: any) => boolean;
  title: string;
  description?: string;
  minHeight?: string;
}

/**
 * JSON Editor component with validation
 * Similar to the original Pipecat editor's JSON editing capabilities
 */
export function JsonEditor({
  value,
  onChange,
  validator = () => true,
  title,
  description,
  minHeight = '150px'
}: JsonEditorProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update text when value changes
  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  // Validate JSON when text changes
  const validateJson = () => {
    try {
      const parsed = JSON.parse(text);
      if (validator(parsed)) {
        setIsValid(true);
        setError(null);
        return parsed;
      } else {
        setIsValid(false);
        setError('Invalid JSON structure');
        return null;
      }
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      return null;
    }
  };

  // Handle saving changes
  const handleSave = () => {
    const parsed = validateJson();
    if (parsed) {
      onChange(parsed);
      setIsTouched(false);
    }
  };

  // Handle canceling changes
  const handleCancel = () => {
    setText(JSON.stringify(value, null, 2));
    setError(null);
    setIsTouched(false);
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setIsTouched(true);
  };

  // Handle focus out (blur)
  const handleBlur = () => {
    validateJson();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {isValid && !error && (
          <span className="text-xs flex items-center text-green-500">
            <Check className="h-3 w-3 mr-1" />
            Valid
          </span>
        )}
      </div>
      
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={`Enter ${title} as JSON...`}
        className={`font-mono text-sm ${error ? 'border-red-500' : isValid ? 'border-green-500' : ''} ${isTouched ? 'border-amber-500' : ''}`}
        style={{ minHeight }}
      />
      
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {isTouched && (
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!!error}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}