/**
 * Environment configuration, validated once at startup.
 * In development, a local `.env` file is loaded if present (Node's built-in loader).
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

// Only used outside production so `npm run dev` works without any setup.
const DEV_JWT_SECRET = 'dev-only-jwt-secret-change-me-0123456789abcdef';
const DEV_PHONE_SECRET = 'dev-only-phone-hash-secret-change-me-0123456789';

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform(value => value === 'true' || value === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    /** Unset in development → an in-memory MongoDB is started (data is lost on restart). */
    MONGO_URI: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    /** HMAC key for phone numbers and OTPs. Rotating it orphans every account. */
    PHONE_HASH_SECRET: z.string().min(32).optional(),

    OTP_PROVIDER: z.enum(['console', 'fixed', 'msg91', 'textlocal']).default('console'),
    /** Test login (OTP_PROVIDER=fixed): this code works for every number and no SMS is sent. */
    FIXED_OTP_CODE: z
      .string()
      .regex(/^\d{6}$/, 'FIXED_OTP_CODE must be 6 digits')
      .default('123456'),
    /** Lets a production server run the fixed test login (closed beta only). */
    ALLOW_TEST_LOGIN: booleanish.optional(),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_TEMPLATE_ID: z.string().optional(),
    /** Name of the OTP variable in the MSG91 template. */
    MSG91_OTP_VAR: z.string().default('otp'),
    TEXTLOCAL_API_KEY: z.string().optional(),
    TEXTLOCAL_SENDER: z.string().optional(),
    /** The DLT-approved template text, with {otp} where the code goes. */
    TEXTLOCAL_MESSAGE: z.string().optional(),
    TEXTLOCAL_TEMPLATE_ID: z.string().optional(),

    /** Comma-separated browser origins. Native apps send no Origin and are unaffected. */
    CORS_ORIGINS: z.string().default(''),
    /** Express "trust proxy" hop count; set to 1 behind one load balancer. */
    TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),

    SENTRY_DSN: z.string().optional(),
    SENTRY_ENABLED: booleanish.optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }
    const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'PHONE_HASH_SECRET'] as const;
    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` });
      }
    }
    if (env.OTP_PROVIDER === 'console') {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_PROVIDER'],
        message: 'The console OTP provider must not be used in production',
      });
    }
    if (env.OTP_PROVIDER === 'fixed' && env.ALLOW_TEST_LOGIN !== true) {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_PROVIDER'],
        message: 'The fixed test login needs ALLOW_TEST_LOGIN=true in production',
      });
    }
  })
  .superRefine((env, ctx) => {
    if (env.OTP_PROVIDER === 'msg91' && (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID)) {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_PROVIDER'],
        message: 'MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required for the msg91 provider',
      });
    }
    if (env.OTP_PROVIDER === 'textlocal') {
      if (!env.TEXTLOCAL_API_KEY || !env.TEXTLOCAL_SENDER || !env.TEXTLOCAL_MESSAGE) {
        ctx.addIssue({
          code: 'custom',
          path: ['OTP_PROVIDER'],
          message:
            'TEXTLOCAL_API_KEY, TEXTLOCAL_SENDER and TEXTLOCAL_MESSAGE are required for the textlocal provider',
        });
      } else if (!env.TEXTLOCAL_MESSAGE.includes('{otp}')) {
        ctx.addIssue({
          code: 'custom',
          path: ['TEXTLOCAL_MESSAGE'],
          message: 'TEXTLOCAL_MESSAGE must contain {otp} where the code goes',
        });
      }
    }
  });

export interface Env {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  mongoUri: string | undefined;
  jwtAccessSecret: string;
  phoneHashSecret: string;
  otpProvider: 'console' | 'fixed' | 'msg91' | 'textlocal';
  fixedOtpCode: string;
  msg91: { authKey: string; templateId: string; otpVar: string } | null;
  textlocal: { apiKey: string; sender: string; message: string; templateId?: string } | null;
  corsOrigins: string[];
  trustProxy: number;
  sentryDsn: string | undefined;
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  const env = result.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    mongoUri: env.MONGO_URI || undefined,
    jwtAccessSecret: env.JWT_ACCESS_SECRET ?? DEV_JWT_SECRET,
    phoneHashSecret: env.PHONE_HASH_SECRET ?? DEV_PHONE_SECRET,
    otpProvider: env.OTP_PROVIDER,
    fixedOtpCode: env.FIXED_OTP_CODE,
    msg91:
      env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID
        ? {
            authKey: env.MSG91_AUTH_KEY,
            templateId: env.MSG91_TEMPLATE_ID,
            otpVar: env.MSG91_OTP_VAR,
          }
        : null,
    textlocal:
      env.TEXTLOCAL_API_KEY && env.TEXTLOCAL_SENDER && env.TEXTLOCAL_MESSAGE
        ? {
            apiKey: env.TEXTLOCAL_API_KEY,
            sender: env.TEXTLOCAL_SENDER,
            message: env.TEXTLOCAL_MESSAGE,
            templateId: env.TEXTLOCAL_TEMPLATE_ID || undefined,
          }
        : null,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    sentryDsn: env.SENTRY_ENABLED === false ? undefined : env.SENTRY_DSN || undefined,
  };
}

/** Loads `apps/api/.env` when present. Never overrides variables already set. */
export function loadDotEnv(dir: string = process.cwd()): void {
  const file = resolve(dir, '.env');
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}
