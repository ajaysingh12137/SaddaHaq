import { type InferSchemaType, Schema, type Types, model } from 'mongoose';

import { type DayLog, LOG_SOURCES, PLATFORM_IDS } from '@saddahaq/shared';

const dayLogSchema = new Schema(
  {
    /** UUID v4 generated on the device. */
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Worker's local calendar date, YYYY-MM-DD. */
    date: { type: String, required: true },
    platform: { type: String, enum: PLATFORM_IDS, required: true },
    source: { type: String, enum: LOG_SOURCES, required: true },
    amount: { type: Number, default: null },
    /** Client clock; used for last-write-wins. */
    updatedAt: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
    /** Server clock of the last write; used to find changes since a sync. */
    serverUpdatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

dayLogSchema.index({ userId: 1, date: 1, platform: 1 }, { unique: true });
dayLogSchema.index({ userId: 1, serverUpdatedAt: 1 });

export type DayLogDoc = InferSchemaType<typeof dayLogSchema> & {
  _id: string;
  userId: Types.ObjectId;
};

export const DayLogModel = model('DayLog', dayLogSchema);

export function toDayLog(doc: DayLogDoc): DayLog {
  return {
    id: doc._id,
    date: doc.date,
    platform: doc.platform as DayLog['platform'],
    source: doc.source as DayLog['source'],
    amount: doc.amount ?? null,
    updatedAt: doc.updatedAt.toISOString(),
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}
