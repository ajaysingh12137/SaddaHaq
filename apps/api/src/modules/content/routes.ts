import { Router } from 'express';

import { contentQuerySchema } from '@saddahaq/shared';

import { validateQuery } from '../../lib/errors';
import { getContent } from './service';

/** Public: the app needs content (e-Shram guide, schemes) before and without login. */
export function contentRoutes(): Router {
  const router = Router();

  // `lang` is accepted for compatibility, but both languages are always returned
  // so the app can switch language offline.
  router.get('/', async (req, res) => {
    const { since } = validateQuery(contentQuerySchema, req);
    const content = await getContent(since);
    res.setHeader('Cache-Control', 'no-cache');
    if (content === null) {
      res.status(304).end();
      return;
    }
    res.json(content);
  });

  return router;
}
