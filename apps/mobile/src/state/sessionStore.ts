import { create } from 'zustand';

import {
  DEFAULT_ELIGIBILITY_CONFIG,
  type EligibilityConfig,
  type Language,
  type User,
} from '@saddahaq/shared';

import { DEFAULT_LANGUAGE } from '../i18n';

/**
 * - booting: opening the database and reading the saved session
 * - signedOut: no tokens on this phone
 * - onboarding: signed in, platforms/consent not finished
 * - ready: main app
 */
export type SessionStatus = 'booting' | 'signedOut' | 'onboarding' | 'ready';

export interface SessionState {
  status: SessionStatus;
  language: Language;
  /** False until the worker picks a language on first launch. */
  languageChosen: boolean;
  user: User | null;
  /** Read-aloud speed (Android: 1.0 = normal). */
  speechRate: number;
  /** Thresholds; replaced by server appConfig once content is cached (Phase 5). */
  eligibilityConfig: EligibilityConfig;
}

export const initialSessionState: SessionState = {
  status: 'booting',
  language: DEFAULT_LANGUAGE,
  languageChosen: false,
  user: null,
  speechRate: 1,
  eligibilityConfig: DEFAULT_ELIGIBILITY_CONFIG,
};

export const useSession = create<SessionState>()(() => ({ ...initialSessionState }));

export const setSession = (patch: Partial<SessionState>) => useSession.setState(patch);

export const resetSessionStore = () => useSession.setState({ ...initialSessionState });
