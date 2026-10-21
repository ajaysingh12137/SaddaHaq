import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { type Language } from '@saddahaq/shared';

import en from './locales/en.json';
import hi from './locales/hi.json';

export const DEFAULT_LANGUAGE: Language = 'hi';

export const resources = { hi: { translation: hi }, en: { translation: en } } as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

/** Initialises i18next once; later calls only switch language. */
export async function initI18n(language: Language = DEFAULT_LANGUAGE) {
  if (!i18next.isInitialized) {
    await i18next.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else if (i18next.language !== language) {
    await i18next.changeLanguage(language);
  }
  return i18next;
}

/** BCP-47 tag for speech. */
export const speechLocale = (language: Language) => (language === 'hi' ? 'hi-IN' : 'en-IN');

export { i18next };
