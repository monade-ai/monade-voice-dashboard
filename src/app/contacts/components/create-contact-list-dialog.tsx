'use client';

import React, { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import { useContactsContext } from '../contexts/contacts-context';

interface CreateContactListDialogProps {
  onSubmit?: (name: string, description?: string) => void;
  initialName?: string;
  initialDescription?: string;
  isEditing?: boolean;
  onClose?: () => void;
}

const CreateContactListDialog: React.FC<CreateContactListDialogProps> = ({
  onSubmit,
  initialName = '',
  initialDescription = '',
  isEditing = false,
  onClose,
}) => {
  const { createContactList } = useContactsContext();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [nameError, setNameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');

      return;
    }
    
    setIsSubmitting(true);
    
    // Create the contact list using the context
    const newList = createContactList(name.trim(), description.trim() || undefined);
    
    // Call the onSubmit callback if provided
    if (onSubmit) {
      onSubmit(name.trim(), description.trim() || undefined);
    }
    
    // Close the dialog if a close function is provided
    if (onClose) {
      onClose();
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <label htmlFor="list-name" className="text-sm font-medium">
          Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="list-name"
          placeholder="E.g., Customers, Leads, etc."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError('');
          }}
          className={nameError ? 'border-red-500' : ''}
        />
        {nameError && (
          <p className="text-red-500 text-sm">{nameError}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <label htmlFor="list-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="list-description"
          placeholder="Enter a description for this contact list"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : isEditing ? 'Update' : 'Create'} Contact List
      </Button>
    </form>
  );
};

export default CreateContactListDialog;