'use client';

import React, { useState } from 'react';

import { useTranslations } from '@/i18n/translations-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Contact } from '@/app/hooks/use-contacts';

import { ContactsProvider } from '../contexts/contacts-context';
import { AssistantsProvider } from '@/app/hooks/use-assistants-context';

import ContactListView from './contacts-list-view';
import ContactUploadDialog from './contact-upload-dialog';
import ContactImportDialog from './contact-import-dialog';
import CreateContactListDialog from './create-contact-list-dialog';
import CreateContact from './create-contact';

/**
 * Main component for the Contact List management page.
 * Manages dialogs and provides the contacts context to child components.
 */
const ContactListPage: React.FC = () => {
  const { t }= useTranslations();
  // Dialog states
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCreateContactDialog, setShowCreateContactDialog] = useState(false);

  // Mock data for initial render
  const mockInitialLists = [
    {
      id: 'list-1',
      name: 'Customers',
      description: 'Active paying customers',
      count: 3,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
    {
      id: 'list-2',
      name: 'Leads',
      description: 'Potential customers from website signups',
      count: 2,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ];
  
  const mockInitialContacts = {
    'list-1': [
      { id: 'contact-1', name: 'John Smith', phone: '+11234567890' },
      { id: 'contact-2', name: 'Amol Derick Soans', phone: '+917795957544' },
      { id: 'contact-3', name: 'Michael Brown', phone: '+11234567892' },
    ],
    'list-2': [
      { id: 'contact-4', name: 'David Wilson', phone: '+11234567893' },
      { id: 'contact-5', name: 'Pintu', phone: '+919939539712' },
    ],
  };

  // Handle contacts upload
  const handleUploadComplete = (uploadedContacts: any[]) => {
    // This is now handled by the ContactsContext
    setShowUploadDialog(false);
  };

  // Handle contacts import from CRM
  const handleImportComplete = (importedContacts: any[]) => {
    // This is now handled by the ContactsContext
    setShowImportDialog(false);
  };

  return (
    <ContactsProvider 
      initialLists={mockInitialLists} 
      initialContacts={mockInitialContacts}
    >
      <AssistantsProvider>
        <div className="container mx-auto py-6 max-w-7xl">
          <ContactListView 
            onCreateList={() => setShowCreateListDialog(true)}
            onUploadContacts={() => setShowUploadDialog(true)}
            onImportContacts={() => setShowImportDialog(true)}
            onCreateContact={() => setShowCreateContactDialog(true)}
          />

          {/* Create Contact List Dialog */}
          <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('contacts.create_list.title')}</DialogTitle>
                <DialogDescription>
                  {t('contacts.create_list.description')}
                </DialogDescription>
              </DialogHeader>
              
              <CreateContactListDialog 
                onSubmit={(name, description) => {
                
                }}
                onClose={() => setShowCreateListDialog(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Upload Contacts Dialog */}
          {showUploadDialog && (
            <ContactUploadDialog
              isOpen={showUploadDialog}
              onClose={() => setShowUploadDialog(false)}
              onUploadComplete={handleUploadComplete}
            />
          )}

          {/* Import from CRM Dialog */}
          <ContactImportDialog
            isOpen={showImportDialog}
            onClose={() => setShowImportDialog(false)}
            onImportComplete={(contacts) => {
              // We don't need to handle import here as it's handled by the dialog
              setShowImportDialog(false);
            }}
          />

          {/* Create Contact Dialog */}
          <Dialog open={showCreateContactDialog} onOpenChange={setShowCreateContactDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('contacts.add_contact.title')}</DialogTitle>
                <DialogDescription>
                  {t('contacts.add_contact.description')}
                </DialogDescription>
              </DialogHeader>
              
              <CreateContact
                onCancel={() => setShowCreateContactDialog(false)}
                onSuccess={(contact) => {
                  setShowCreateContactDialog(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </AssistantsProvider>
    </ContactsProvider>
  );
};

export default ContactListPage;
