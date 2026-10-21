/**
 * Session lifecycle: startup, language, sign-in, onboarding and profile updates.
 * The phone is the source of truth; profile changes are queued locally and
 * pushed to the server when possible, so onboarding finishes even offline.
 */
import { type Language, type PlatformId, type User, type UserPatch } from '@saddahaq/shared';

import { ApiError } from '../api/errors';
import { openDatabase } from '../db/database';
import { kvDelete, kvGet, kvSet } from '../db/kv';
import { initI18n } from '../i18n';
import { clearTokens } from '../security/secureStore';
import { loadLogs } from '../state/logsStore';
import { setSession, useSession } from '../state/sessionStore';
import { api, onAuthLost, tokenStore } from './api';

const KEYS = {
  language: 'settings.language',
  speechRate: 'settings.speechRate',
  user: 'session.user',
  onboarded: 'session.onboarded',
  pendingPatch: 'profile.pendingPatch',
} as const;

export async function bootstrap(): Promise<void> {
  await openDatabase();
  const [language, speechRate, user, onboarded, tokens] = await Promise.all([
    kvGet<Language>(KEYS.language),
    kvGet<number>(KEYS.speechRate),
    kvGet<User>(KEYS.user),
    kvGet<boolean>(KEYS.onboarded),
    tokenStore.get(),
  ]);
  await initI18n(language ?? undefined);
  await loadLogs();

  onAuthLost(() => {
    void handleAuthLost();
  });

  const signedIn = tokens !== null;
  setSession({
    language: language ?? useSession.getState().language,
    languageChosen: language !== null,
    speechRate: speechRate ?? 1,
    user: signedIn ? user : null,
    status: !signedIn ? 'signedOut' : onboarded ? 'ready' : 'onboarding',
  });

  if (signedIn) {
    void flushProfile();
  }
}

export async function chooseLanguage(language: Language): Promise<void> {
  await kvSet(KEYS.language, language);
  await initI18n(language);
  setSession({ language, languageChosen: true });
  if (useSession.getState().user) {
    await queueProfilePatch({ language });
  }
}

export async function setSpeechRate(rate: number): Promise<void> {
  await kvSet(KEYS.speechRate, rate);
  setSession({ speechRate: rate });
}

export async function requestOtp(phone: string) {
  return api().requestOtp(phone);
}

/** Verifies the OTP, stores tokens and moves to the platforms/consent steps. */
export async function signIn(phone: string, otp: string): Promise<User> {
  const result = await api().verifyOtp(phone, otp);
  await tokenStore.set({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  await kvSet(KEYS.user, result.user);
  await kvSet(KEYS.onboarded, false);
  setSession({ user: result.user, status: 'onboarding' });
  return result.user;
}

export interface OnboardingChoices {
  platforms: PlatformId[];
  backup: boolean;
  analytics: boolean;
}

export async function completeOnboarding(choices: OnboardingChoices): Promise<void> {
  const { language } = useSession.getState();
  await queueProfilePatch({
    language,
    platforms: choices.platforms,
    consents: {
      backup: choices.backup,
      analytics: choices.analytics,
      acceptedAt: new Date().toISOString(),
    },
  });
  await kvSet(KEYS.onboarded, true);
  setSession({ status: 'ready' });
}

/** Applies a profile change locally at once and queues it for the server. */
export async function queueProfilePatch(patch: UserPatch): Promise<void> {
  const pending = (await kvGet<UserPatch>(KEYS.pendingPatch)) ?? {};
  await kvSet(KEYS.pendingPatch, { ...pending, ...patch });

  const user = useSession.getState().user;
  if (user) {
    const updated: User = {
      ...user,
      ...patch,
      consents: patch.consents ?? user.consents,
    } as User;
    await kvSet(KEYS.user, updated);
    setSession({ user: updated });
  }
  void flushProfile();
}

let flushing: Promise<void> | null = null;
let flushAgain = false;

/**
 * Sends queued profile changes. Safe to call often; keeps them on network
 * errors. A call during a flush schedules one more pass after it.
 */
export function flushProfile(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      await doFlush();
    } while (flushAgain);
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<void> {
  const pending = await kvGet<UserPatch>(KEYS.pendingPatch);
  if (!pending || Object.keys(pending).length === 0 || !(await tokenStore.get())) {
    return;
  }
  try {
    const user = await api().patchMe(pending);
    // Only clear what we sent; newer changes may have been queued meanwhile.
    const latest = (await kvGet<UserPatch>(KEYS.pendingPatch)) ?? {};
    if (JSON.stringify(latest) === JSON.stringify(pending)) {
      await kvDelete(KEYS.pendingPatch);
      await kvSet(KEYS.user, user);
      setSession({ user });
    }
  } catch (error) {
    // Offline or server trouble: keep it queued. A rejected change would never succeed.
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401
    ) {
      await kvDelete(KEYS.pendingPatch);
    }
  }
}

async function handleAuthLost(): Promise<void> {
  tokenStore.forget();
  await clearTokens();
  setSession({ status: 'signedOut', user: null });
}

/** Signs out on this phone. Local logs stay; they belong to the worker. */
export async function signOut(): Promise<void> {
  const tokens = await tokenStore.get();
  if (tokens) {
    await api()
      .logout(tokens.refreshToken)
      .catch(() => undefined);
  }
  await kvDelete(KEYS.user);
  await kvDelete(KEYS.pendingPatch);
  await handleAuthLost();
}
