import { type Logger } from 'pino';

import { type Env } from './config/env';
import { type RateLimitConfig } from './middleware/rate-limit';
import { type OtpProvider } from './modules/auth/otp';

/** Dependencies shared by every route; injected so tests can swap them. */
export interface AppContext {
  env: Env;
  logger: Logger;
  otpProvider: OtpProvider;
  rateLimits: RateLimitConfig;
  /** Server clock; overridable in tests. */
  now: () => Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      /** Set by requireAuth from the verified access token. */
      userId: string;
    }
  }
}
