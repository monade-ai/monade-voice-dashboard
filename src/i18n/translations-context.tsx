'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

import { Locale, defaultLocale } from './config';
import enMessages from './messages/en.json';
import hiMessages from './messages/hi.json';
import bnMessages from './messages/bn.json';
import deMessages from './messages/de.json';
import etMessages from './messages/et.json';

// Define the messages type
type Messages = typeof enMessages;

// Create a map of all translation messages
const messagesMap: any = {
  en: enMessages,
  hi: hiMessages,
  bn: bnMessages,
  de: deMessages,
  et: etMessages,
};

// Create a context for translations
type TranslationsContextType = {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const TranslationsContext = createContext<TranslationsContextType | undefined>(undefined);

export function TranslationsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>(messagesMap[defaultLocale]);

  useEffect(() => {
    // Get the locale from localStorage
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && Object.keys(messagesMap).includes(savedLocale)) {
      setLocale(savedLocale);
      setMessages(messagesMap[savedLocale]);
    }
  }, []);

  // Function to translate keys
  const t = (key: string): string => {
    // Split the key by dots to access nested properties
    const path = key.split('.');
    let value: any = messages;
    
    // Traverse the messages object
    for (const segment of path) {
      if (!value[segment]) {
        console.warn(`Translation key not found: ${key}`);

        return key;
      }
      value = value[segment];
    }
    
    return value;
  };

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setMessages(messagesMap[newLocale]);
    localStorage.setItem('locale', newLocale);
  };

  return (
    <TranslationsContext.Provider value={{ t, locale, setLocale: changeLocale }}>
      {children}
    </TranslationsContext.Provider>
  );
}

// Custom hook to use translations
export function useTranslations() {
  const context = useContext(TranslationsContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }

  return context;
}