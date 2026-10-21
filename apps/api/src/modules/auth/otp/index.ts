import { type Logger } from 'pino';

import { type Env } from '../../../config/env';
import { ConsoleOtpProvider } from './console';
import { Msg91OtpProvider } from './msg91';
import { type OtpProvider } from './provider';

export { OtpDeliveryError, type OtpProvider } from './provider';

export function createOtpProvider(env: Env, logger: Logger): OtpProvider {
  if (env.otpProvider === 'msg91' && env.msg91) {
    return new Msg91OtpProvider(env.msg91);
  }
  return new ConsoleOtpProvider(logger);
}
