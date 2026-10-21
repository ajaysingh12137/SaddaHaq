import { Router } from 'express';

import { syncRequestSchema } from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { validateBody } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { syncLogs } from './service';

export function syncRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.post('/', async (req, res) => {
    const body = validateBody(syncRequestSchema, req);
    res.json(await syncLogs(res.locals.userId, body, ctx));
  });

  return router;
}
