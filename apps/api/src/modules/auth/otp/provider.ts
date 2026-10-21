/** Sends a one-time password to a phone. Implementations must not log the full number. */
export interface OtpProvider {
  readonly name: string;
  /** `phone` is the normalised 10-digit Indian mobile number. */
  send(phone: string, otp: string): Promise<void>;
}

export class OtpDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OtpDeliveryError';
  }
}
