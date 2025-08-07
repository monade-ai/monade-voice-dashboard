'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { useAssistants } from '../hooks/use-assistants-context';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteConfirmationModal({ isOpen, onClose }: DeleteConfirmationModalProps) {
  const { currentAssistant, deleteAssistant, setCurrentAssistant } = useAssistants();
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  const handleDelete = () => {
    if (!currentAssistant) {
      onClose();

      return;
    }

    if (confirmationText !== currentAssistant.name) {
      setError(`Please enter the assistant name "${currentAssistant.name}" to confirm deletion`);

      return;
    }

    // Delete the assistant
    deleteAssistant(currentAssistant.id);
    setCurrentAssistant(null);
    setConfirmationText('');
    setError('');
    onClose();
  };

  const handleCancel = () => {
    setConfirmationText('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Delete Assistant
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the assistant
            {currentAssistant ? ` "${currentAssistant.name}"` : ''} and all of its associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Please type the assistant name to confirm deletion:
            </p>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={currentAssistant?.name || 'Assistant name'}
              className="w-full"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
<Button variant="destructive" className="text-white" onClick={handleDelete}>
  Delete Assistant
</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
