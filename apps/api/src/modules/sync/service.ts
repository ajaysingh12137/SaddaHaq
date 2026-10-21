/**
 * Two-way sync of day logs.
 *
 * Rules:
 * - Only for users with the backup consent on.
 * - Last-write-wins on the client `updatedAt` (clamped to server time + 5 min so a
 *   phone with a wrong clock cannot win forever).
 * - One log per (user, date, platform). A change whose id is new but whose
 *   (date, platform) already exists is applied to the existing log; that log's id
 *   is canonical and the client re-keys to it when it receives serverChanges.
 * - A log's (date, platform) never changes; the app edits by soft-deleting and
 *   re-adding. A change that tries to move an existing id is ignored.
 * - Every log an incoming change touched (applied or not) is echoed back, so the
 *   client always learns the winning version and canonical id.
 * - "Changes since" uses the server clock (`serverUpdatedAt`), never client clocks.
 */

import { type DayLog, type SyncRequest, type SyncResponse } from '@saddahaq/shared';
import { Types } from 'mongoose';

import { type AppContext } from '../../context';
import { AppError } from '../../lib/errors';
import { DayLogModel, toDayLog } from '../../models/day-log';
import { UserModel } from '../../models/user';

/** `now` handed back is this much earlier, so writes racing this request are not missed. */
export const SYNC_OVERLAP_MS = 5_000;
export const MAX_CLIENT_CLOCK_SKEW_MS = 5 * 60_000;

interface StoredLog {
  _id: string;
  userId: Types.ObjectId;
  date: string;
  platform: string;
  updatedAt: Date;
}

const keyOf = (log: { date: string; platform: string }) => `${log.date}|${log.platform}`;

export async function syncLogs(
  userId: string,
  request: SyncRequest,
  ctx: AppContext,
): Promise<SyncResponse> {
  const user = await UserModel.findOne({ _id: userId }, { consents: 1 }).lean();
  if (!user?.consents.backup) {
    throw new AppError(403, 'backup_disabled', 'Turn on backup in settings to sync');
  }

  const startedAt = ctx.now();
  await applyChanges(userId, request.changes, startedAt, ctx);

  const docs = await DayLogModel.find({
    userId,
    ...(request.since ? { serverUpdatedAt: { $gt: new Date(request.since) } } : {}),
  })
    .sort({ serverUpdatedAt: 1 })
    .lean();

  return {
    serverChanges: docs.map(toDayLog),
    now: new Date(startedAt.getTime() - SYNC_OVERLAP_MS).toISOString(),
  };
}

async function applyChanges(
  userId: string,
  changes: readonly DayLog[],
  now: Date,
  ctx: AppContext,
): Promise<void> {
  // Within one batch, keep only the newest change per id.
  const latestById = new Map<string, DayLog>();
  for (const change of changes) {
    const previous = latestById.get(change.id);
    if (!previous || Date.parse(change.updatedAt) > Date.parse(previous.updatedAt)) {
      latestById.set(change.id, change);
    }
  }
  const incoming = [...latestById.values()].sort(
    (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
  );
  if (incoming.length === 0) {
    return;
  }

  const existing: StoredLog[] = await DayLogModel.find(
    {
      $or: [
        { _id: { $in: incoming.map(c => c.id) } },
        { userId, date: { $in: [...new Set(incoming.map(c => c.date))] } },
      ],
    },
    { _id: 1, userId: 1, date: 1, platform: 1, updatedAt: 1 },
  ).lean();

  const byId = new Map(existing.map(doc => [doc._id, doc]));
  const byKey = new Map(
    existing.filter(doc => String(doc.userId) === userId).map(doc => [keyOf(doc), doc]),
  );

  const userObjectId = new Types.ObjectId(userId);
  const maxUpdatedAt = now.getTime() + MAX_CLIENT_CLOCK_SKEW_MS;
  const ops: Parameters<typeof DayLogModel.bulkWrite>[0] = [];
  const echo = (doc: StoredLog) =>
    ops.push({
      updateOne: { filter: { _id: doc._id, userId }, update: { $set: { serverUpdatedAt: now } } },
    });

  for (const change of incoming) {
    const sameId = byId.get(change.id);
    if (sameId && String(sameId.userId) !== userId) {
      ctx.logger.warn({ userId }, 'Sync change used an id owned by another user; ignored');
      continue;
    }
    if (sameId && keyOf(sameId) !== keyOf(change)) {
      echo(sameId);
      continue;
    }

    const updatedAt = new Date(Math.min(Date.parse(change.updatedAt), maxUpdatedAt));
    const fields = {
      source: change.source,
      amount: change.amount,
      updatedAt,
      deletedAt: change.deletedAt ? new Date(change.deletedAt) : null,
      serverUpdatedAt: now,
    };
    const target = sameId ?? byKey.get(keyOf(change));

    if (!target) {
      const created: StoredLog = {
        _id: change.id,
        userId: userObjectId,
        date: change.date,
        platform: change.platform,
        updatedAt,
      };
      ops.push({
        insertOne: {
          document: {
            ...fields,
            _id: change.id,
            userId: userObjectId,
            date: change.date,
            platform: change.platform,
          },
        },
      });
      byId.set(created._id, created);
      byKey.set(keyOf(created), created);
      continue;
    }

    if (target.updatedAt.getTime() >= updatedAt.getTime()) {
      echo(target);
      continue;
    }

    ops.push({
      updateOne: {
        filter: { _id: target._id, userId, updatedAt: { $lt: updatedAt } },
        update: { $set: fields },
      },
    });
    target.updatedAt = updatedAt;
  }

  try {
    await DayLogModel.bulkWrite(ops, { ordered: false });
  } catch (error) {
    // A parallel sync inserted the same log first; the next sync reconciles it.
    if (!isOnlyDuplicateKeyErrors(error)) {
      throw error;
    }
    ctx.logger.info({ userId }, 'Sync hit duplicate keys from a concurrent sync');
  }
}

export function isOnlyDuplicateKeyErrors(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const writeErrors = (error as { writeErrors?: Array<{ code?: number }> }).writeErrors;
  if (Array.isArray(writeErrors) && writeErrors.length > 0) {
    return writeErrors.every(e => e.code === 11000);
  }
  return (error as { code?: number }).code === 11000;
}
