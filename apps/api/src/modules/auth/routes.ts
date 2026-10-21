import { Router } from 'express';

import {
  logoutRequestSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshRequestSchema,
} from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { validateBody } from '../../lib/errors';
import { type createRateLimiters } from '../../middleware/rate-limit';
import { requestOtp, verifyOtp } from './service';
import { revokeRefreshToken, rotateRefreshToken } from './tokens';

export function authRoutes(
  ctx: AppContext,
  limiters: ReturnType<typeof createRateLimiters>,
): Router {
  const router = Router();

  router.post(
    '/otp/request',
    limiters.otpRequestPerIp,
    limiters.otpRequestPerPhone,
    async (req, res) => {
      const { phone } = validateBody(otpRequestSchema, req);
      res.status(202).json(await requestOtp(phone, ctx));
    },
  );

  router.post('/otp/verify', limiters.otpVerifyPerIp, async (req, res) => {
    const { phone, otp } = validateBody(otpVerifySchema, req);
    res.json(await verifyOtp(phone, otp, ctx));
  });

  router.post('/refresh', async (req, res) => {
    const { refreshToken } = validateBody(refreshRequestSchema, req);
    res.json(await rotateRefreshToken(refreshToken, ctx));
  });

  router.post('/logout', async (req, res) => {
    const { refreshToken } = validateBody(logoutRequestSchema, req);
    await revokeRefreshToken(refreshToken, ctx);
    res.status(204).end();
  });

  return router;
}
