import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    /** Set when rotated or logged out; presenting a revoked token signals theft. */
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
// MongoDB removes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);

const otpSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, required: true },
    /** When the current code was sent, for the resend cooldown. */
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = model('Otp', otpSchema);
