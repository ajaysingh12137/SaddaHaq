import { Router } from 'express';

import { userPatchSchema } from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { validateBody } from '../../lib/errors';
import { requireAuth } from '../../middleware/auth';
import { deleteAccount, getUser, updateUser } from './service';

export function userRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get('/', async (_req, res) => {
    res.json(await getUser(res.locals.userId));
  });

  router.patch('/', async (req, res) => {
    const patch = validateBody(userPatchSchema, req);
    res.json(await updateUser(res.locals.userId, patch, ctx));
  });

  router.delete('/', async (_req, res) => {
    await deleteAccount(res.locals.userId, ctx);
    res.status(204).end();
  });

  return router;
}
