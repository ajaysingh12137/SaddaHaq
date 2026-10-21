import {
  type UserPatch,
  authResponseSchema,
  otpRequestResponseSchema,
  userSchema,
} from '@saddahaq/shared';

import { type ApiClient } from './client';

/** Typed wrappers for every endpoint the app calls. */
export function createEndpoints(client: ApiClient) {
  return {
    requestOtp: (phone: string) =>
      client.post('/auth/otp/request', {
        body: { phone },
        auth: false,
        schema: otpRequestResponseSchema,
      }),
    verifyOtp: (phone: string, otp: string) =>
      client.post('/auth/otp/verify', {
        body: { phone, otp },
        auth: false,
        schema: authResponseSchema,
      }),
    logout: (refreshToken: string) =>
      client.post('/auth/logout', { body: { refreshToken }, auth: false }),
    getMe: () => client.get('/me', { schema: userSchema }),
    patchMe: (patch: UserPatch) => client.patch('/me', { body: patch, schema: userSchema }),
    deleteMe: () => client.delete('/me'),
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
