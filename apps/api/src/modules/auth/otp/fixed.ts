import { type Logger } from 'pino';

import { type OtpProvider } from './provider';

/**
 * Test login: every number signs in with the same code and no SMS is sent.
 * Refused in production unless ALLOW_TEST_LOGIN=true (closed beta only).
 */
export class FixedOtpProvider implements OtpProvider {
  readonly name = 'fixed';

  constructor(
    readonly fixedCode: string,
    private readonly logger: Logger,
  ) {}

  async send(phone: string): Promise<void> {
    this.logger.info({ phoneLast4: phone.slice(-4) }, 'Test login: fixed code, no SMS sent');
  }
}
