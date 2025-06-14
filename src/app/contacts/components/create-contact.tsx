'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useTranslations } from '@/i18n/translations-context';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useContactsContext, Contact } from '../contexts/contacts-context';

interface CreateContactProps {
  onCancel: () => void;
  onSuccess?: (contact: Contact) => void;
}

const CreateContact: React.FC<CreateContactProps> = ({ onCancel, onSuccess }) => {
  const { t } = useTranslations();
  const { selectedBucket, addContact } = useContactsContext();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when bucket changes
  useEffect(() => {
    setFormData({});
    setErrors({});
  }, [selectedBucket]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    if (!selectedBucket) return false;
    const newErrors: Record<string, string> = {};
    
    // Phone number is always required and must be validated
    const phone = formData.phone_number || '';
    if (!phone.trim()) {
      newErrors.phone_number = 'Phone number is required.';
    } else if (!/^(\+[1-9]\d{1,14}|0\d{9,14})$/.test(phone)) {
      newErrors.phone_number = 'Phone number must start with a country code (e.g., +1) or 0 (e.g., 0987654321).';
    }

    // Validate other dynamic fields (all required)
    selectedBucket.fields.forEach(field => {
      if (!formData[field]?.trim()) {
        newErrors[field] = `${field} is required.`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBucket || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const contactData = {
        phone_number: formData.phone_number,
        data: { ...formData },
      };
      delete contactData.data.phone_number; // Avoid duplicating phone number inside data object

      const newContact = await addContact(selectedBucket.id, contactData);
      if (onSuccess) {
        onSuccess(newContact);
      }
    } catch (error: any) {
      console.error("Error submitting contact:", error);
      setErrors(prev => ({ ...prev, form: error.message || 'An error occurred.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedBucket) {
    return <p className="text-center text-muted-foreground">Please select a bucket to add a contact.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* Always include phone number input */}
      <div className="space-y-2">
        <Label htmlFor="phone_number">
          Phone Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone_number"
          placeholder="+1234567890"
          value={formData.phone_number || ''}
          onChange={(e) => handleInputChange('phone_number', e.target.value)}
          className={errors.phone_number ? 'border-red-500' : ''}
        />
        {errors.phone_number && <p className="text-red-500 text-sm">{errors.phone_number}</p>}
      </div>

      {/* Dynamically render other fields from the bucket */}
      {selectedBucket.fields.map(field => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field} className="capitalize">{field}</Label>
          <Input
            id={field}
            placeholder={`Enter ${field}`}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={errors[field] ? 'border-red-500' : ''}
          />
          {errors[field] && <p className="text-red-500 text-sm">{errors[field]}</p>}
        </div>
      ))}

      {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : t('contacts.addContact.title')}
        </Button>
      </div>
    </form>
  );
};

export default CreateContact;
