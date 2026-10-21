/**
 * Secrets kept in the Android Keystore / iOS Keychain via react-native-keychain:
 * the auth tokens and the SQLCipher database key. Nothing here touches disk in plain text.
 */
import * as Keychain from 'react-native-keychain';

import { randomBytes, toHex } from '../lib/random';

const AUTH_SERVICE = 'in.saddahaq.auth';
const DB_KEY_SERVICE = 'in.saddahaq.dbkey';

const options = (service: string) => ({
  service,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Keychain.setGenericPassword('session', JSON.stringify(tokens), options(AUTH_SERVICE));
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const entry = await Keychain.getGenericPassword({ service: AUTH_SERVICE });
  if (!entry) {
    return null;
  }
  try {
    const parsed = JSON.parse(entry.password) as Partial<StoredTokens>;
    return parsed.accessToken && parsed.refreshToken
      ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
      : null;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: AUTH_SERVICE });
}

/** Returns the 256-bit database key, creating it on first launch. */
export async function getOrCreateDatabaseKey(): Promise<string> {
  const entry = await Keychain.getGenericPassword({ service: DB_KEY_SERVICE });
  if (entry) {
    return entry.password;
  }
  const key = toHex(randomBytes(32));
  await Keychain.setGenericPassword('db', key, options(DB_KEY_SERVICE));
  return key;
}

export async function clearDatabaseKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: DB_KEY_SERVICE });
}
