import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';

import {
  getBuckets,
  createBucket as apiCreateBucket,
  deleteBucket as apiDeleteBucket,
  getContactsForBucket,
  addContact as apiAddContact,
  addContactsBulk as apiAddContactsBulk,
  deleteContact as apiDeleteContact,
} from '@/app/(app)/contacts/utils/contacts-api';
import { useAssistants, Assistant } from '@/app/hooks/use-assistants-context';

// Define the new data structures based on the API
export interface Bucket {
  id: string;
  name: string;
  description: string;
  fields: string[];
  count: number;
  createdAt: string;
}

export interface Contact {
  phone_number: string;
  data: Record<string, any>;
}

// Define the context type
interface ContactsContextType {
  buckets: Bucket[];
  contacts: Record<string, Contact[]>;
  selectedBucket: Bucket | null;
  isLoading: boolean;
  assistants: Assistant[];
  assistantPhoneNumbers: string[];

  // Actions
  createBucket: (name: string, description: string, fields: string[]) => Promise<Bucket>;
  selectBucket: (bucketId: string | null) => void;
  addContact: (bucketId: string, contact: Omit<Contact, 'id'>) => Promise<Contact>;
  addContactsBulk: (bucketId: string, contacts: Omit<Contact, 'id'>[]) => Promise<Contact[]>;
  removeContact: (bucketId: string, phoneNumber: string) => Promise<void>;
  removeBucket: (bucketId: string) => Promise<void>;
}

// Create the context with a default value
const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

// Provider component
interface ContactsProviderProps {
  children: ReactNode;
}

export const ContactsProvider: React.FC<ContactsProviderProps> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [contacts, setContacts] = useState<Record<string, Contact[]>>({});
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { assistants } = useAssistants();
  const assistantPhoneNumbers = assistants
    .map((a) => a.phoneNumber)
    .filter((p): p is string => !!p);

  const fetchBuckets = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[ContactsContext] Fetching buckets...');
      console.log('[ContactsContext] API_BASE_URL:', process.env.NEXT_PUBLIC_DATABASE_URL);
      const fetchedBuckets = await getBuckets();
      console.log('[ContactsContext] Fetched buckets:', fetchedBuckets);
      console.log('[ContactsContext] Buckets count:', fetchedBuckets?.length || 0);
      setBuckets(fetchedBuckets || []);
    } catch (error) {
      console.error('[ContactsContext] Failed to fetch buckets:', error);
      console.error('[ContactsContext] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      setBuckets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  const selectBucket = useCallback(async (bucketId: string | null) => {
    if (!bucketId) {
      setSelectedBucket(null);

      return;
    }
    const bucket = buckets.find(b => b.id === bucketId);
    if (bucket) {
      setSelectedBucket(bucket);
      // Fetch contacts for the selected bucket if they aren't loaded yet
      if (!contacts[bucketId]) {
        setIsLoading(true);
        try {
          const fetchedContacts = await getContactsForBucket(bucketId);
          setContacts(prev => ({ ...prev, [bucketId]: fetchedContacts || [] }));
        } catch (error) {
          console.error(`Failed to fetch contacts for bucket ${bucketId}:`, error);
          setContacts(prev => ({ ...prev, [bucketId]: [] }));
        } finally {
          setIsLoading(false);
        }
      }
    }
  }, [buckets, contacts]);

  const createBucket = async (name: string, description: string, fields: string[]) => {
    const newBucket = await apiCreateBucket({ name, description, fields });
    await fetchBuckets(); // Re-fetch to get the updated list

    return newBucket;
  };

  const removeBucket = async (bucketId: string) => {
    await apiDeleteBucket(bucketId);
    await fetchBuckets(); // Re-fetch
    if (selectedBucket?.id === bucketId) {
      setSelectedBucket(null);
    }
  };

  const addContact = async (bucketId: string, contactData: any) => {
    const newContact = await apiAddContact(bucketId, contactData);
    // Re-fetch contacts for the bucket
    const fetchedContacts = await getContactsForBucket(bucketId);
    setContacts(prev => ({ ...prev, [bucketId]: fetchedContacts || [] }));
    await fetchBuckets(); // Re-fetch buckets to update count

    return newContact;
  };

  const addContactsBulk = async (bucketId: string, contactsData: any[]) => {
    const newContacts = await apiAddContactsBulk(bucketId, contactsData);
    // Re-fetch contacts for the bucket
    const fetchedContacts = await getContactsForBucket(bucketId);
    setContacts(prev => ({ ...prev, [bucketId]: fetchedContacts || [] }));
    await fetchBuckets(); // Re-fetch buckets to update count

    return newContacts;
  };

  const removeContact = async (bucketId: string, phoneNumber: string) => {
    await apiDeleteContact(bucketId, phoneNumber);
    // Re-fetch contacts for the bucket
    const fetchedContacts = await getContactsForBucket(bucketId);
    setContacts(prev => ({ ...prev, [bucketId]: fetchedContacts || [] }));
    await fetchBuckets(); // Re-fetch buckets to update count
  };

  return (
    <ContactsContext.Provider value={{
      buckets,
      contacts,
      selectedBucket,
      isLoading,
      assistants,
      assistantPhoneNumbers,
      createBucket,
      selectBucket,
      addContact,
      addContactsBulk,
      removeContact,
      removeBucket,
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
