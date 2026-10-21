import { type RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';

import { type AppContext } from '../context';
import { unauthorized } from '../lib/errors';
import { UserModel } from '../models/user';
import { verifyAccessToken } from '../modules/auth/tokens';

/**
 * Verifies the Bearer access token and that the user still exists, then sets
 * `res.locals.userId`. Every user-data query must filter by that id.
 */
export function requireAuth(ctx: AppContext): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized();
    }
    const userId = verifyAccessToken(token, ctx.env.jwtAccessSecret);
    // A deleted (or deleting) account's unexpired tokens must stop working immediately.
    if (!isValidObjectId(userId) || !(await UserModel.exists({ _id: userId, deletingAt: null }))) {
      throw unauthorized('Account not found');
    }
    res.locals.userId = userId;
    next();
  };
}
