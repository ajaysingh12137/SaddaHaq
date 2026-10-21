import { Schema, model } from 'mongoose';

const localizedTextSchema = new Schema(
  { hi: { type: String, required: true }, en: { type: String, required: true } },
  { _id: false },
);
const localizedListSchema = new Schema(
  { hi: { type: [String], default: [] }, en: { type: [String], default: [] } },
  { _id: false },
);
const localized = { type: localizedTextSchema, required: true } as const;
const localizedList = { type: localizedListSchema, required: true } as const;

const schemeSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    order: { type: Number, required: true },
    name: localized,
    covers: localized,
    whoQualifies: localized,
    documents: localizedList,
    whereToApply: localized,
    helpline: { type: String, default: null },
    url: { type: String, default: null },
    lastVerified: { type: String, required: true },
    placeholder: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const SchemeModel = model('Scheme', schemeSchema);

const eshramStepSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    order: { type: Number, required: true },
    title: localized,
    body: localized,
    illustration: { type: String, required: true },
    lastVerified: { type: String, required: true },
    placeholder: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const EshramStepModel = model('EshramStep', eshramStepSchema);

/** Single document (key "default"). */
const appConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    minAppVersion: { type: String, required: true },
    singleThreshold: { type: Number, required: true },
    multiThreshold: { type: Number, required: true },
    fyStartMonth: { type: Number, required: true, min: 1, max: 12 },
    /** Bumped by the seed so deletions of content also invalidate client caches. */
    contentUpdatedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const AppConfigModel = model('AppConfig', appConfigSchema);
