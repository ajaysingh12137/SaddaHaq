import pino, { type DestinationStream, type Logger } from 'pino';

/**
 * Paths never written to logs. Request bodies are not logged at all, but these
 * guard against a handler logging one by mistake.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'phone',
  '*.phone',
  'otp',
  '*.otp',
  'refreshToken',
  '*.refreshToken',
  'accessToken',
  '*.accessToken',
  'body.phone',
  'body.otp',
];

const TEN_DIGIT_PHONE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/g;

/** Masks Indian mobile numbers inside free text, keeping the last 2 digits. */
export function maskPhones(text: string): string {
  return text.replace(TEN_DIGIT_PHONE, match => `******${match.slice(-2)}`);
}

export function createLogger(
  level: string,
  pretty: boolean,
  destination?: DestinationStream,
): Logger {
  const options: pino.LoggerOptions = {
    level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    hooks: {
      // Last line of defence: scrub phone numbers from log messages.
      logMethod(args, method) {
        const [first, ...rest] = args;
        if (typeof first === 'string') {
          return method.apply(this, [maskPhones(first), ...rest] as Parameters<typeof method>);
        }
        if (typeof rest[0] === 'string') {
          return method.apply(this, [first, maskPhones(rest[0]), ...rest.slice(1)] as Parameters<
            typeof method
          >);
        }
        return method.apply(this, args);
      },
    },
    ...(pretty && !destination
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  };
  return destination ? pino(options, destination) : pino(options);
}
