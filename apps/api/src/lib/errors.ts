import { type Request } from 'express';
import { type ZodType, type z } from 'zod';

/** An error safe to show the client: status, stable machine code, short message. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);

export const notFound = (message = 'Not found') => new AppError(404, 'not_found', message);

/** Validates a value with Zod, throwing a 400 with field issues on failure. */
export function validate<S extends ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      400,
      'validation_error',
      'Request is invalid',
      result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}

export const validateBody = <S extends ZodType>(schema: S, req: Request) =>
  validate(schema, req.body ?? {});

export const validateQuery = <S extends ZodType>(schema: S, req: Request) =>
  validate(schema, req.query);
