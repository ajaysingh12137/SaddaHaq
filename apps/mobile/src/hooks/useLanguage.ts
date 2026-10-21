import { type Language } from '@saddahaq/shared';

import { useSession } from '../state/sessionStore';

export function useLanguage(): Language {
  return useSession(s => s.language);
}
