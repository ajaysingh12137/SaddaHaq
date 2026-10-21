/**
 * Zod schemas for every API request/response body, shared by app and API.
 */

import { z } from 'zod';

import { isValidISODate } from './fy';
import { normalizeIndianMobile } from './phone';
import { PLATFORM_IDS } from './platforms';

// ---------------------------------------------------------------------------
// Primitives

export const LANGUAGES = ['hi', 'en'] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof languageSchema>;

export const platformIdSchema = z.enum(PLATFORM_IDS);

export const isoDateSchema = z
  .string()
  .refine(isValidISODate, { message: 'Expected a YYYY-MM-DD date' });

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Accepts common spellings of an Indian mobile number; outputs 10 digits. */
export const phoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeIndianMobile(value);
  if (normalized === null) {
    ctx.addIssue({ code: 'custom', message: 'Invalid Indian mobile number' });
    return z.NEVER;
  }
  return normalized;
});

export const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

// ---------------------------------------------------------------------------
// Day logs and sync

export const LOG_SOURCES = ['tap', 'ocr'] as const;
export const logSourceSchema = z.enum(LOG_SOURCES);

export const dayLogSchema = z.object({
  /** UUID v4 generated on the device. */
  id: z.uuid({ version: 'v4' }),
  date: isoDateSchema,
  platform: platformIdSchema,
  source: logSourceSchema,
  amount: z.number().nonnegative().max(1_000_000).nullable(),
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable(),
});
export type DayLog = z.infer<typeof dayLogSchema>;

export const MAX_SYNC_BATCH = 500;

export const syncRequestSchema = z.object({
  changes: z.array(dayLogSchema).max(MAX_SYNC_BATCH),
  /** Server time returned by the previous sync; null on first sync. */
  since: isoDateTimeSchema.nullable(),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;

export const syncResponseSchema = z.object({
  serverChanges: z.array(dayLogSchema),
  now: isoDateTimeSchema,
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

// ---------------------------------------------------------------------------
// Auth

export const otpRequestSchema = z.object({ phone: phoneSchema });
export const otpVerifySchema = z.object({ phone: phoneSchema, otp: otpSchema });
export const refreshRequestSchema = z.object({ refreshToken: z.string().min(32).max(512) });
export const logoutRequestSchema = refreshRequestSchema;

export const otpRequestResponseSchema = z.object({
  expiresInSec: z.number().int().positive(),
  resendAfterSec: z.number().int().nonnegative(),
});
export type OtpRequestResponse = z.infer<typeof otpRequestResponseSchema>;

export type OtpRequest = z.infer<typeof otpRequestSchema>;
export type OtpVerifyRequest = z.infer<typeof otpVerifySchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

// ---------------------------------------------------------------------------
// User

export const consentsSchema = z.object({
  backup: z.boolean(),
  analytics: z.boolean(),
  acceptedAt: isoDateTimeSchema.nullable(),
});
export type Consents = z.infer<typeof consentsSchema>;

export const userSchema = z.object({
  id: z.string(),
  phoneLast4: z.string().regex(/^\d{4}$/),
  language: languageSchema,
  platforms: z.array(platformIdSchema),
  eshramRegistered: z.boolean(),
  consents: consentsSchema,
  createdAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const userPatchSchema = z
  .object({
    language: languageSchema,
    platforms: z
      .array(platformIdSchema)
      .max(PLATFORM_IDS.length)
      .refine(list => new Set(list).size === list.length, { message: 'Duplicate platforms' }),
    eshramRegistered: z.boolean(),
    consents: consentsSchema,
  })
  .partial()
  .strict();
export type UserPatch = z.infer<typeof userPatchSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshResponseSchema = authResponseSchema.omit({ user: true });
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

// ---------------------------------------------------------------------------
// Content

export const localizedTextSchema = z.object({ hi: z.string(), en: z.string() });
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedListSchema = z.object({ hi: z.array(z.string()), en: z.array(z.string()) });
export type LocalizedList = z.infer<typeof localizedListSchema>;

export const appConfigSchema = z.object({
  minAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  singleThreshold: z.number().int().positive(),
  multiThreshold: z.number().int().positive(),
  fyStartMonth: z.number().int().min(1).max(12),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export const schemeSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  name: localizedTextSchema,
  covers: localizedTextSchema,
  whoQualifies: localizedTextSchema,
  documents: localizedListSchema,
  whereToApply: localizedTextSchema,
  /** Null until a verified number is supplied. */
  helpline: z.string().nullable(),
  /** Null until a verified official URL is supplied. */
  url: z.url().nullable(),
  lastVerified: isoDateSchema,
  /** True for seed content that must be verified before launch. */
  placeholder: z.boolean(),
});
export type Scheme = z.infer<typeof schemeSchema>;

export const eshramStepSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  title: localizedTextSchema,
  body: localizedTextSchema,
  /** Key of a bundled illustration placeholder. */
  illustration: z.string(),
  lastVerified: isoDateSchema,
  /** True for seed content that must be verified before launch. */
  placeholder: z.boolean(),
});
export type EshramStep = z.infer<typeof eshramStepSchema>;

export const contentQuerySchema = z.object({
  lang: languageSchema.optional(),
  since: isoDateTimeSchema.optional(),
});

export const contentResponseSchema = z.object({
  schemes: z.array(schemeSchema),
  eshramSteps: z.array(eshramStepSchema),
  appConfig: appConfigSchema,
  /** Latest change across all content; send back as `since` next time. */
  updatedAt: isoDateTimeSchema,
});
export type ContentResponse = z.infer<typeof contentResponseSchema>;
