import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Deterministic keyed hash of a 10-digit phone number, so we can look users up
 * without storing the number itself.
 */
export function hashPhone(phone: string, secret: string): string {
  return createHmac('sha256', secret).update(`phone:${phone}`).digest('hex');
}

/** OTPs are only 6 digits, so they are keyed by a server secret and bound to the phone. */
export function hashOtp(otp: string, phoneHash: string, secret: string): string {
  return createHmac('sha256', secret).update(`otp:${phoneHash}:${otp}`).digest('hex');
}

/** Refresh tokens are 256-bit random, so a plain SHA-256 is enough to store them. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
