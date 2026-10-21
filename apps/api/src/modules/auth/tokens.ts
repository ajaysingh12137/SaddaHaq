import jwt from 'jsonwebtoken';

import { type RefreshResponse } from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { generateRefreshToken, hashToken } from '../../lib/crypto';
import { unauthorized } from '../../lib/errors';
import { RefreshTokenModel } from '../../models/auth';

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ISSUER = 'saddahaq-api';
const AUDIENCE = 'saddahaq-app';

export function signAccessToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

/** Returns the user id from a valid access token, or throws 401. */
export function verifyAccessToken(token: string, secret: string): string {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw unauthorized('Invalid token');
    }
    return payload.sub;
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

export async function issueTokens(userId: string, ctx: AppContext): Promise<RefreshResponse> {
  const refreshToken = generateRefreshToken();
  await RefreshTokenModel.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(ctx.now().getTime() + REFRESH_TOKEN_TTL_MS),
  });
  return { accessToken: signAccessToken(userId, ctx.env.jwtAccessSecret), refreshToken };
}

/**
 * Exchanges a refresh token for a new pair. The old token is revoked atomically.
 * Presenting an already-revoked token means it leaked (or a client bug), so every
 * session of that user is revoked.
 */
export async function rotateRefreshToken(token: string, ctx: AppContext): Promise<RefreshResponse> {
  const now = ctx.now();
  const tokenHash = hashToken(token);
  const current = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
  ).lean();

  if (!current) {
    const reused = await RefreshTokenModel.findOne({ tokenHash, revokedAt: { $ne: null } }).lean();
    if (reused) {
      await RefreshTokenModel.deleteMany({ userId: reused.userId });
      ctx.logger.warn(
        { userId: String(reused.userId) },
        'Refresh token reuse detected; sessions revoked',
      );
    }
    throw unauthorized('Invalid or expired refresh token');
  }
  return issueTokens(String(current.userId), ctx);
}

export async function revokeRefreshToken(token: string, ctx: AppContext): Promise<void> {
  await RefreshTokenModel.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: ctx.now() } },
  );
}
