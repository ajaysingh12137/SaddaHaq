import { type User, type UserPatch } from '@saddahaq/shared';

import { type AppContext } from '../../context';
import { notFound } from '../../lib/errors';
import { OtpModel, RefreshTokenModel } from '../../models/auth';
import { DayLogModel } from '../../models/day-log';
import { UserModel, toPublicUser } from '../../models/user';

export async function getUser(userId: string): Promise<User> {
  const user = await UserModel.findOne({ _id: userId, deletingAt: null }).lean();
  if (!user) {
    throw notFound('User not found');
  }
  return toPublicUser(user);
}

export async function updateUser(userId: string, patch: UserPatch, ctx: AppContext): Promise<User> {
  const set: Record<string, unknown> = {};
  if (patch.language !== undefined) set.language = patch.language;
  if (patch.platforms !== undefined) set.platforms = patch.platforms;
  if (patch.eshramRegistered !== undefined) set.eshramRegistered = patch.eshramRegistered;
  if (patch.consents !== undefined) {
    set['consents.backup'] = patch.consents.backup;
    set['consents.analytics'] = patch.consents.analytics;
    // Record consent time with the server clock, not the client's.
    set['consents.acceptedAt'] = ctx.now();
  }

  const before = await UserModel.findOneAndUpdate(
    { _id: userId, deletingAt: null },
    { $set: set },
    { returnDocument: 'before' },
  ).lean();
  if (!before) {
    throw notFound('User not found');
  }

  // Turning cloud backup off removes the copy we hold (the phone keeps its own).
  if (before.consents.backup && patch.consents?.backup === false) {
    const { deletedCount } = await DayLogModel.deleteMany({ userId });
    ctx.logger.info({ userId, deletedCount }, 'Backup turned off; server day logs deleted');
  }

  return getUser(userId);
}

/**
 * Hard-deletes the user and everything tied to them. The user is first marked
 * as deleting (which blocks authentication), so a crash part-way through can be
 * finished by `purgePendingDeletions` on the next start.
 */
export async function deleteAccount(userId: string, ctx: AppContext): Promise<void> {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId },
    { $set: { deletingAt: ctx.now() } },
    { returnDocument: 'after' },
  ).lean();
  if (!user) {
    return;
  }
  await finishDeletion(String(user._id), user.phoneHash);
  ctx.logger.info({ userId }, 'Account deleted');
}

async function finishDeletion(userId: string, phoneHash: string): Promise<void> {
  await DayLogModel.deleteMany({ userId });
  await RefreshTokenModel.deleteMany({ userId });
  await OtpModel.deleteMany({ phoneHash });
  await UserModel.deleteOne({ _id: userId });
}

export async function purgePendingDeletions(ctx: AppContext): Promise<number> {
  const pending = await UserModel.find({ deletingAt: { $ne: null } }, { phoneHash: 1 }).lean();
  for (const user of pending) {
    await finishDeletion(String(user._id), user.phoneHash);
  }
  if (pending.length > 0) {
    ctx.logger.info({ count: pending.length }, 'Finished interrupted account deletions');
  }
  return pending.length;
}
