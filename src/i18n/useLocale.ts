'use client';

import { useState, useEffect } from 'react';
import { Locale, defaultLocale, locales } from './config';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  // Load the locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && locales.includes(savedLocale)) {
      setLocale(savedLocale);
    }
  }, []);

  // Save the locale to localStorage when it changes
  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    // Reload the page to apply the new locale
    window.location.reload();
  };

  return { locale, changeLocale };
}