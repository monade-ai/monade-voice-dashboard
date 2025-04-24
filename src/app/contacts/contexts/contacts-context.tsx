import React, { createContext, useContext, ReactNode } from 'react';

import { useContacts, Contact, ContactList } from '@/app/hooks/use-contacts';
import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';

// Define the context type
interface ContactsContextType {
  contactLists: ContactList[];
  contacts: Record<string, Contact[]>;
  selectedList: ContactList | null;
  isLoading: boolean;
  searchResults: Contact[];
  searchQuery: string;
  assistants: Assistant[];
  assistantPhoneNumbers: string[];
  
  // Actions
  createContactList: (name: string, description?: string) => ContactList;
  selectContactList: (listId: string | null) => void;
  addContactToList: (listId: string, contact: Omit<Contact, 'id'>) => Contact;
  addContactsToList: (listId: string, contacts: Omit<Contact, 'id'>[]) => Contact[];
  removeContactFromList: (listId: string, contactId: string) => void;
  removeContactList: (listId: string) => void;
  searchInCurrentList: (query: string) => void;
  clearSearch: () => void;
}

// Create the context with a default value
const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

// Provider component
interface ContactsProviderProps {
  children: ReactNode;
  initialLists?: ContactList[];
  initialContacts?: Record<string, Contact[]>;
}

export const ContactsProvider: React.FC<ContactsProviderProps> = ({
  children,
  initialLists,
  initialContacts,
}) => {
  const contactsData = useContacts({ initialLists, initialContacts });
  const { assistants } = useAssistants();
  const assistantPhoneNumbers = assistants
    .map((a) => a.phoneNumber)
    .filter((p): p is string => !!p);

  return (
    <ContactsContext.Provider value={{
      ...contactsData,
      assistants,
      assistantPhoneNumbers,
    }}>
      {children}
    </ContactsContext.Provider>
  );
};

// Custom hook to use the contacts context
export const useContactsContext = () => {
  const context = useContext(ContactsContext);
  
  if (context === undefined) {
    throw new Error('useContactsContext must be used within a ContactsProvider');
  }
  
  return context;
};
