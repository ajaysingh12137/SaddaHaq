import { useCallback } from 'react';

import { type Language, type LocalizedList, type LocalizedText } from '@saddahaq/shared';

import { useSession } from '../state/sessionStore';

export function useLanguage(): Language {
  return useSession(s => s.language);
}

/** Picks the worker's language from server content that carries both. */
export function useLocalized() {
  const language = useLanguage();
  return useCallback(
    <T extends LocalizedText | LocalizedList>(value: T): T[Language] => value[language],
    [language],
  );
}
