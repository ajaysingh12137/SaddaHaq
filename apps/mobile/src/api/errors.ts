/** `status` 0 means the request never got an HTTP response. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export const networkError = () => new ApiError(0, 'network', 'Network request failed');
export const timeoutError = () => new ApiError(0, 'timeout', 'Request timed out');

const KNOWN_CODES = [
  'network',
  'timeout',
  'otp_invalid',
  'otp_locked',
  'otp_delivery_failed',
  'rate_limited',
  'validation_error',
] as const;

type KnownCode = (typeof KNOWN_CODES)[number];

export type ErrorMessage =
  | { key: `errors.${KnownCode}` | 'errors.server' }
  | { key: 'errors.otp_cooldown'; values: { seconds: number } };

/** Maps any error to a translatable message. */
export function errorMessage(error: unknown): ErrorMessage {
  if (error instanceof ApiError) {
    if (error.code === 'otp_cooldown') {
      const seconds =
        (error.details as { retryAfterSec?: number } | undefined)?.retryAfterSec ?? 60;
      return { key: 'errors.otp_cooldown', values: { seconds } };
    }
    if ((KNOWN_CODES as readonly string[]).includes(error.code)) {
      return { key: `errors.${error.code as KnownCode}` };
    }
  }
  return { key: 'errors.server' };
}
