import { type ErrorRequestHandler, type RequestHandler } from 'express';

import { type AppContext } from '../context';
import { AppError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
};

/** Maps errors to `{ error: { code, message, details? } }`. Internals are never leaked. */
export function errorHandler(ctx: AppContext): ErrorRequestHandler {
  return (error, req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }

    // body-parser errors carry a `type` and an HTTP status.
    const type = (error as { type?: string }).type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'invalid_json', message: 'Body is not valid JSON' } });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'payload_too_large', message: 'Body is too large' } });
      return;
    }

    (req.log ?? ctx.logger).error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
  };
}
