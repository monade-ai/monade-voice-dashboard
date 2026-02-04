'use client';

import React from 'react';

import { ContactsProvider } from '../contexts/contacts-context';

import ContactListView from './contacts-list-view';

/**
 * Main component for the Contact List management page.
 * Wraps the view with the necessary context provider.
 */
const ContactListPage: React.FC = () => {
  return (
    <ContactsProvider>
      <div className="container mx-auto py-6 max-w-7xl">
        <ContactListView />
      </div>
    </ContactsProvider>
  );
};

export default ContactListPage;
