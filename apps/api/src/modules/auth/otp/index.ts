import { type Logger } from 'pino';

import { type Env } from '../../../config/env';
import { ConsoleOtpProvider } from './console';
import { FixedOtpProvider } from './fixed';
import { Msg91OtpProvider } from './msg91';
import { type OtpProvider } from './provider';
import { TextlocalOtpProvider } from './textlocal';

export { OtpDeliveryError, type OtpProvider } from './provider';

export function createOtpProvider(env: Env, logger: Logger): OtpProvider {
  if (env.otpProvider === 'fixed') {
    logger.warn(
      'TEST LOGIN ON: every number signs in with the fixed code. Never use with real workers.',
    );
    return new FixedOtpProvider(env.fixedOtpCode, logger);
  }
  if (env.otpProvider === 'msg91' && env.msg91) {
    return new Msg91OtpProvider(env.msg91);
  }
  if (env.otpProvider === 'textlocal' && env.textlocal) {
    return new TextlocalOtpProvider(env.textlocal);
  }
  return new ConsoleOtpProvider(logger);
}
