import { useState } from 'react';
import { FunctionDefinition } from '../store/workflow-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { JsonEditor } from './json-editor';

interface FunctionEditorProps {
  function?: FunctionDefinition;
  onChange: (func: FunctionDefinition) => void;
}

/**
 * Component for editing function definitions
 * Uses JSON editor similar to the original Pipecat editor
 */
export function FunctionEditor({ function: funcDef, onChange }: FunctionEditorProps) {
  // Wrap the function in the expected structure for editing
  const functionWrapper = {
    type: 'function',
    function: funcDef || {
      name: 'function_name',
      description: 'Function description',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  };
  
  // Function to validate the function structure
  const validateFunction = (json: any): boolean => {
    if (typeof json !== 'object' || json === null) return false;
    if (json.type !== 'function' || !json.function) return false;
    
    const func = json.function;
    
    // Basic requirement validation
    if (!func.name || typeof func.name !== 'string') return false;
    if (!func.parameters || typeof func.parameters !== 'object') return false;
    
    // Parameters should have a type and properties
    if (func.parameters.type !== 'object' || !func.parameters.properties) return false;
    
    // If transition_to exists, it should be a string
    if (func.transition_to !== undefined && typeof func.transition_to !== 'string') return false;
    
    return true;
  };
  
  // Handle changes to the function wrapper
  const handleChange = (updatedWrapper: any) => {
    // Extract the function from the wrapper and pass it to onChange
    onChange(updatedWrapper.function);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Function Definition</CardTitle>
        <CardDescription>Define the function properties and parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <JsonEditor
          value={functionWrapper}
          onChange={handleChange}
          validator={validateFunction}
          title="Function Configuration"
          description="Edit function object with name, description, parameters, and optional transition_to"
          minHeight="300px"
        />
      </CardContent>
    </Card>
  );
}