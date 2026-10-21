import { type ContentResponse } from '@saddahaq/shared';

import { AppError } from '../../lib/errors';
import { AppConfigModel, EshramStepModel, SchemeModel } from '../../models/content';

/**
 * Returns all content in both languages, or null when nothing changed after
 * `since` (the route answers 304). Content is small, so clients always replace
 * their whole cached copy rather than merging deltas — this also handles deletions.
 */
export async function getContent(since?: string): Promise<ContentResponse | null> {
  const [config, schemes, steps] = await Promise.all([
    AppConfigModel.findOne({ key: 'default' }).lean(),
    SchemeModel.find().sort({ order: 1 }).lean(),
    EshramStepModel.find().sort({ order: 1 }).lean(),
  ]);
  if (!config) {
    throw new AppError(503, 'content_unavailable', 'Content has not been seeded yet');
  }

  const timestamps = [
    config.contentUpdatedAt,
    config.updatedAt,
    ...schemes.map(s => s.updatedAt),
    ...steps.map(s => s.updatedAt),
  ].map(date => date.getTime());
  const updatedAt = new Date(Math.max(...timestamps));

  if (since !== undefined && new Date(since).getTime() >= updatedAt.getTime()) {
    return null;
  }

  return {
    schemes: schemes.map(s => ({
      id: s.slug,
      order: s.order,
      name: s.name,
      covers: s.covers,
      whoQualifies: s.whoQualifies,
      documents: { hi: s.documents.hi, en: s.documents.en },
      whereToApply: s.whereToApply,
      helpline: s.helpline ?? null,
      url: s.url ?? null,
      lastVerified: s.lastVerified,
      placeholder: s.placeholder,
    })),
    eshramSteps: steps.map(s => ({
      id: s.slug,
      order: s.order,
      title: s.title,
      body: s.body,
      illustration: s.illustration,
      lastVerified: s.lastVerified,
      placeholder: s.placeholder,
    })),
    appConfig: {
      minAppVersion: config.minAppVersion,
      singleThreshold: config.singleThreshold,
      multiThreshold: config.multiThreshold,
      fyStartMonth: config.fyStartMonth,
    },
    updatedAt: updatedAt.toISOString(),
  };
}
