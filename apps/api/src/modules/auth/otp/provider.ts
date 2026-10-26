/** Sends a one-time password to a phone. Implementations must not log the full number. */
export interface OtpProvider {
  readonly name: string;
  /** Test login only: every number gets this code instead of a random one. */
  readonly fixedCode?: string;
  /** `phone` is the normalised 10-digit Indian mobile number. */
  send(phone: string, otp: string): Promise<void>;
}

export class OtpDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OtpDeliveryError';
  }
}
