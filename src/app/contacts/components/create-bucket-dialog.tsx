'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useContactsContext } from '../contexts/contacts-context';

interface CreateBucketDialogProps {
  onClose: () => void;
}

const CreateBucketDialog: React.FC<CreateBucketDialogProps> = ({ onClose }) => {
  const { createBucket } = useContactsContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [currentField, setCurrentField] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddField = () => {
    const newField = currentField.trim();
    if (newField && !fields.includes(newField)) {
      setFields([...fields, newField]);
      setCurrentField('');
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddField();
    }
  };

  const removeField = (fieldToRemove: string) => {
    setFields(fields.filter(field => field !== fieldToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Bucket name is required.');
      return;
    }
    if (fields.length === 0) {
      setError('At least one field is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBucket(name.trim(), description.trim(), fields);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create bucket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <label htmlFor="bucket-name" className="text-sm font-medium">
          Bucket Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="bucket-name"
          placeholder="E.g., High-Value Leads"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="bucket-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="bucket-description"
          placeholder="A brief description of this bucket"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Contact Fields <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-muted-foreground">Define the data fields for contacts in this bucket.</p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a field (e.g., Email, Company)"
            value={currentField}
            onChange={(e) => setCurrentField(e.target.value)}
            onKeyDown={handleFieldKeyDown}
          />
          <Button type="button" onClick={handleAddField}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {fields.map((field) => (
            <Badge key={field} variant="secondary" className="flex items-center gap-1">
              {field}
              <button type="button" onClick={() => removeField(field)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Bucket'}
      </Button>
    </form>
  );
};

export default CreateBucketDialog;
