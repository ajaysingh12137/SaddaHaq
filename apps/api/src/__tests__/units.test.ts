import { type Request, type Response } from 'express';

import { errorHandler } from '../middleware/errors';
import { isOnlyDuplicateKeyErrors } from '../modules/sync/service';
import { createHarness } from './helpers/setup';

describe('isOnlyDuplicateKeyErrors', () => {
  it.each([
    [{ code: 11000 }, true],
    [{ writeErrors: [{ code: 11000 }, { code: 11000 }] }, true],
    [{ writeErrors: [{ code: 11000 }, { code: 121 }] }, false],
    [{ writeErrors: [], code: 11000 }, true],
    [{ code: 2 }, false],
    [new Error('boom'), false],
    [null, false],
    ['string error', false],
  ])('%p → %p', (error, expected) => {
    expect(isOnlyDuplicateKeyErrors(error)).toBe(expected);
  });
});

describe('errorHandler', () => {
  function fakeResponse() {
    const res = { statusCode: 0, body: undefined as unknown };
    return Object.assign(res, {
      status(code: number) {
        res.statusCode = code;
        return this;
      },
      json(body: unknown) {
        res.body = body;
        return this;
      },
    });
  }

  it('hides internal errors behind a generic 500 and logs them', () => {
    const h = createHarness();
    const res = fakeResponse();
    errorHandler(h.ctx)(
      new Error('database password is hunter2'),
      {} as Request,
      res as unknown as Response,
      () => undefined,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: { code: 'internal', message: 'Something went wrong' } });
    expect(h.logs.join('\n')).toContain('Unhandled error');
  });
});
