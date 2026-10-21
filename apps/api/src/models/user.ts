import { type InferSchemaType, Schema, model } from 'mongoose';

import { LANGUAGES, PLATFORM_IDS, type User as PublicUser } from '@saddahaq/shared';

const consentsSchema = new Schema(
  {
    backup: { type: Boolean, default: false, required: true },
    analytics: { type: Boolean, default: false, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    /** HMAC of the 10-digit number; the number itself is never stored. */
    phoneHash: { type: String, required: true, unique: true },
    phoneLast4: { type: String, required: true },
    language: { type: String, enum: LANGUAGES, default: 'hi', required: true },
    platforms: { type: [{ type: String, enum: PLATFORM_IDS }], default: [] },
    eshramRegistered: { type: Boolean, default: false, required: true },
    consents: { type: consentsSchema, required: true, default: () => ({}) },
    /** Set while an account deletion is in progress; such users cannot authenticate. */
    deletingAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: unknown };

export const UserModel = model('User', userSchema);

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: String(user._id),
    phoneLast4: user.phoneLast4,
    language: user.language as PublicUser['language'],
    platforms: user.platforms as PublicUser['platforms'],
    eshramRegistered: user.eshramRegistered,
    consents: {
      backup: user.consents.backup,
      analytics: user.consents.analytics,
      acceptedAt: user.consents.acceptedAt ? user.consents.acceptedAt.toISOString() : null,
    },
    createdAt: user.createdAt.toISOString(),
  };
}
