// Polyfills crypto.getRandomValues on Hermes; must load before first use.
import 'react-native-get-random-values';

declare const crypto: { getRandomValues<T extends ArrayBufferView>(array: T): T };

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** RFC 4122 version 4 UUID from a cryptographic random source. */
export function uuidv4(): string {
  const b = randomBytes(16);
  // Set the version (4) and variant (10xx) bits as RFC 4122 requires.
  /* eslint-disable no-bitwise */
  b[6] = ((b[6] as number) & 0x0f) | 0x40;
  b[8] = ((b[8] as number) & 0x3f) | 0x80;
  /* eslint-enable no-bitwise */
  const hex = toHex(b);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
