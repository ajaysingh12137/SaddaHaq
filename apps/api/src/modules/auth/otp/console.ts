import { type Logger } from 'pino';

import { type OtpProvider } from './provider';

/** Development provider: writes the OTP to the server log. Refused in production by env validation. */
export class ConsoleOtpProvider implements OtpProvider {
  readonly name = 'console';

  constructor(private readonly logger: Logger) {}

  async send(phone: string, otp: string): Promise<void> {
    this.logger.warn({ phoneLast4: phone.slice(-4), devOtp: otp }, 'DEV OTP (console provider)');
  }
}
