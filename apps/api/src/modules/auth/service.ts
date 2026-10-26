import { type AuthResponse, type OtpRequestResponse } from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { generateOtp, hashOtp, hashPhone, safeEqualHex } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { OtpModel } from '../../models/auth';
import { UserModel, toPublicUser } from '../../models/user';
import { OtpDeliveryError } from './otp';
import { issueTokens } from './tokens';

export const OTP_TTL_SEC = 5 * 60;
export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_MAX_ATTEMPTS = 5;

const invalidOtp = () => new AppError(400, 'otp_invalid', 'The code is wrong or has expired');

export async function requestOtp(phone: string, ctx: AppContext): Promise<OtpRequestResponse> {
  const now = ctx.now();
  const phoneHash = hashPhone(phone, ctx.env.phoneHashSecret);

  const existing = await OtpModel.findOne({ phoneHash }).lean();
  if (existing && existing.expiresAt > now) {
    const elapsedSec = (now.getTime() - existing.sentAt.getTime()) / 1000;
    if (elapsedSec < OTP_RESEND_COOLDOWN_SEC) {
      const retryAfterSec = Math.ceil(OTP_RESEND_COOLDOWN_SEC - elapsedSec);
      throw new AppError(429, 'otp_cooldown', 'Please wait before requesting another code', {
        retryAfterSec,
      });
    }
  }

  const otp = ctx.otpProvider.fixedCode ?? generateOtp();
  await OtpModel.findOneAndUpdate(
    { phoneHash },
    {
      $set: {
        otpHash: hashOtp(otp, phoneHash, ctx.env.phoneHashSecret),
        attempts: 0,
        sentAt: now,
        expiresAt: new Date(now.getTime() + OTP_TTL_SEC * 1000),
      },
    },
    { upsert: true },
  );

  try {
    await ctx.otpProvider.send(phone, otp);
  } catch (error) {
    await OtpModel.deleteOne({ phoneHash });
    ctx.logger.error({ err: error, provider: ctx.otpProvider.name }, 'OTP delivery failed');
    if (error instanceof OtpDeliveryError) {
      throw new AppError(502, 'otp_delivery_failed', 'Could not send the code. Please try again.');
    }
    throw error;
  }

  return {
    expiresInSec: OTP_TTL_SEC,
    resendAfterSec: OTP_RESEND_COOLDOWN_SEC,
    ...(ctx.otpProvider.fixedCode ? { testCode: ctx.otpProvider.fixedCode } : {}),
  };
}

export async function verifyOtp(
  phone: string,
  otp: string,
  ctx: AppContext,
): Promise<AuthResponse> {
  const now = ctx.now();
  const phoneHash = hashPhone(phone, ctx.env.phoneHashSecret);

  // Count the attempt atomically before comparing, so parallel guesses cannot exceed the limit.
  const record = await OtpModel.findOneAndUpdate(
    { phoneHash, expiresAt: { $gt: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  ).lean();

  if (!record) {
    const locked = await OtpModel.exists({ phoneHash, expiresAt: { $gt: now } });
    if (locked) {
      await OtpModel.deleteOne({ phoneHash });
      throw new AppError(429, 'otp_locked', 'Too many wrong codes. Request a new one.');
    }
    throw invalidOtp();
  }

  if (!safeEqualHex(record.otpHash, hashOtp(otp, phoneHash, ctx.env.phoneHashSecret))) {
    throw invalidOtp();
  }

  // Single use: only the request that deletes it may proceed.
  const consumed = await OtpModel.findOneAndDelete({ _id: record._id });
  if (!consumed) {
    throw invalidOtp();
  }

  const user = await UserModel.findOneAndUpdate(
    { phoneHash },
    { $setOnInsert: { phoneHash, phoneLast4: phone.slice(-4) } },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  if (user.deletingAt) {
    throw new AppError(
      409,
      'account_deleting',
      'This account is being deleted. Try again shortly.',
    );
  }

  const tokens = await issueTokens(String(user._id), ctx);
  return { ...tokens, user: toPublicUser(user) };
}
