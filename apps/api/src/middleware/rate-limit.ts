import { type Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { normalizeIndianMobile } from '@saddahaq/shared';

import { hashPhone } from '../lib/crypto';

export interface RateLimitConfig {
  windowMs: number;
  /** All routes, per IP. */
  general: number;
  /** OTP sends per IP. */
  otpRequestPerIp: number;
  /** OTP sends per phone number (also capped by the 60 s resend cooldown). */
  otpRequestPerPhone: number;
  /** OTP verification attempts per IP. */
  otpVerifyPerIp: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  general: 300,
  otpRequestPerIp: 10,
  otpRequestPerPhone: 5,
  otpVerifyPerIp: 20,
};

const limitedMessage = {
  error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' },
};

const ipKey = (req: Request) => ipKeyGenerator(req.ip ?? '0.0.0.0');

// Note: limits are kept in process memory. Running several API instances needs
// a shared store (e.g. rate-limit-mongo or Redis).
function limiter(limit: number, windowMs: number, keyGenerator: (req: Request) => string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: limitedMessage,
    keyGenerator,
  });
}

export function createRateLimiters(config: RateLimitConfig, phoneHashSecret: string) {
  return {
    general: limiter(config.general, config.windowMs, ipKey),
    otpRequestPerIp: limiter(config.otpRequestPerIp, config.windowMs, ipKey),
    // Keyed by the hashed number so raw phone numbers never sit in memory.
    otpRequestPerPhone: limiter(config.otpRequestPerPhone, config.windowMs, req => {
      const phone = normalizeIndianMobile(String(req.body?.phone ?? ''));
      return phone ? `phone:${hashPhone(phone, phoneHashSecret)}` : `ip:${ipKey(req)}`;
    }),
    otpVerifyPerIp: limiter(config.otpVerifyPerIp, config.windowMs, ipKey),
  };
}
