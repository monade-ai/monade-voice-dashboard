"use client"

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useContactsContext } from '../contexts/contacts-context';
import { Contact } from '@/app/hooks/use-contacts';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

interface CreateContactProps {
  onCancel: () => void;
  onSuccess?: (contact: Contact) => void;
}

// Validate phone number format
const validatePhoneNumber = (phone: string) => {
  const regex = /^\+[1-9]\d{1,14}$/;
  return regex.test(phone);
};

// Create a schema for form validation
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine(validatePhoneNumber, "Phone number must include country code (e.g., +11234567890)")
});

const CreateContact: React.FC<CreateContactProps> = ({ onCancel, onSuccess }) => {
  const { selectedList, addContactToList } = useContactsContext();
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  
  const validateForm = () => {
    try {
      contactSchema.parse({ name, phone });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: { [k: string]: string } = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            formattedErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
      return false;
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedList) {
      alert("Please select a contact list first");
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    const newContact = addContactToList(selectedList.id, { name, phone });
    
    if (onSuccess) {
      onSuccess(newContact);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors(prev => ({ ...prev, name: undefined }));
          }}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          placeholder="+11234567890"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setErrors(prev => ({ ...prev, phone: undefined }));
          }}
          className={errors.phone ? "border-red-500" : ""}
        />
        {errors.phone && (
          <p className="text-red-500 text-sm">{errors.phone}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Include country code (e.g., +1 for US numbers)
        </p>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Contact
        </Button>
      </div>
    </form>
  );
};

export default CreateContact;