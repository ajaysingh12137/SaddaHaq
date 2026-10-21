import { __resetDatabaseForTests } from '../db/database';
import { kvGet } from '../db/kv';
import { __useFetchForTests } from '../services/api';
import {
  bootstrap,
  chooseLanguage,
  completeOnboarding,
  flushProfile,
  signIn,
  signOut,
} from '../services/session';
import { loadTokens, saveTokens } from '../security/secureStore';
import { resetSessionStore, useSession } from '../state/sessionStore';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  resetSessionStore();
  __resetDatabaseForTests();
  server = createFakeServer();
  __useFetchForTests(server.fetchImpl);
});

describe('bootstrap', () => {
  it('starts signed out with Hindi and no language chosen on first launch', async () => {
    await bootstrap();
    expect(useSession.getState()).toMatchObject({
      status: 'signedOut',
      language: 'hi',
      languageChosen: false,
    });
  });

  it('resumes onboarding when signed in but not finished', async () => {
    await saveTokens(TOKENS);
    await bootstrap();
    expect(useSession.getState().status).toBe('onboarding');
  });
});

describe('language', () => {
  it('is saved locally and survives a restart', async () => {
    await bootstrap();
    await chooseLanguage('en');
    resetSessionStore();
    __resetDatabaseForTests();
    await bootstrap();
    expect(useSession.getState()).toMatchObject({ language: 'en', languageChosen: true });
  });
});

describe('sign-in and onboarding', () => {
  beforeEach(async () => {
    await bootstrap();
    server.on('POST /auth/otp/verify', () => ({ body: { ...TOKENS, user: makeUser() } }));
  });

  it('stores tokens in the keychain and moves to onboarding', async () => {
    await signIn('9876543210', '123456');
    expect(await loadTokens()).toEqual(TOKENS);
    expect(useSession.getState().status).toBe('onboarding');
  });

  it('finishes onboarding offline and sends the profile later', async () => {
    await signIn('9876543210', '123456');
    // No PATCH route yet → behaves like a network failure.
    server.on('PATCH /me', () => {
      throw new TypeError('Network request failed');
    });

    await completeOnboarding({ platforms: ['zomato', 'uber'], backup: true, analytics: false });
    expect(useSession.getState().status).toBe('ready');
    expect(useSession.getState().user?.platforms).toEqual(['zomato', 'uber']);
    expect(await kvGet('profile.pendingPatch')).toMatchObject({ platforms: ['zomato', 'uber'] });

    // Back online.
    server.on('PATCH /me', body => ({ body: makeUser(body as object) }));
    await flushProfile();
    expect(await kvGet('profile.pendingPatch')).toBeNull();
    const sent = server.callsTo('PATCH /me').at(-1)?.body as Record<string, unknown>;
    expect(sent).toMatchObject({
      language: 'hi',
      platforms: ['zomato', 'uber'],
      consents: { backup: true, analytics: false },
    });
  });

  it('drops a queued change the server rejects as invalid', async () => {
    await signIn('9876543210', '123456');
    server.on('PATCH /me', () => ({ status: 400, body: { error: { code: 'validation_error' } } }));
    await completeOnboarding({ platforms: ['ola'], backup: false, analytics: false });
    await flushProfile();
    expect(await kvGet('profile.pendingPatch')).toBeNull();
  });

  it('signs out, keeping the phone usable for a new sign-in', async () => {
    await signIn('9876543210', '123456');
    server.on('POST /auth/logout', () => ({ status: 204 }));
    await signOut();
    expect(await loadTokens()).toBeNull();
    expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    expect(server.callsTo('POST /auth/logout')[0]?.body).toEqual({
      refreshToken: TOKENS.refreshToken,
    });
  });

  it('signs out automatically when the session cannot be refreshed', async () => {
    await signIn('9876543210', '123456');
    server.on('PATCH /me', () => ({ status: 401, body: {} }));
    server.on('POST /auth/refresh', () => ({ status: 401, body: {} }));
    await completeOnboarding({ platforms: ['ola'], backup: false, analytics: false });
    await flushProfile();
    await new Promise<void>(resolve => setTimeout(() => resolve(), 0));
    expect(useSession.getState().status).toBe('signedOut');
    expect(await loadTokens()).toBeNull();
  });
});
