export const locales = ['en', 'hi', 'bn', 'de', 'et'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  de: 'Deutsch',
  et: 'Eesti',
};

export const defaultLocale: Locale = 'en';