import { AppConfigModel, EshramStepModel, SchemeModel } from '../models/content';
import { SEED_APP_CONFIG, SEED_ESHRAM_STEPS, SEED_SCHEMES } from '@saddahaq/shared';

export interface SeedSummary {
  schemes: number;
  eshramSteps: number;
}

/**
 * Upserts seed content by slug and removes anything not in the seed. Bumps
 * `contentUpdatedAt` so apps refetch even when only deletions happened.
 * Re-running it is safe.
 */
export async function seedContent(now: Date): Promise<SeedSummary> {
  // The public id is stored as the slug.
  for (const { id, ...scheme } of SEED_SCHEMES) {
    await SchemeModel.updateOne({ slug: id }, { $set: { slug: id, ...scheme } }, { upsert: true });
  }
  await SchemeModel.deleteMany({ slug: { $nin: SEED_SCHEMES.map(s => s.id) } });

  for (const { id, ...step } of SEED_ESHRAM_STEPS) {
    await EshramStepModel.updateOne(
      { slug: id },
      { $set: { slug: id, ...step } },
      { upsert: true },
    );
  }
  await EshramStepModel.deleteMany({ slug: { $nin: SEED_ESHRAM_STEPS.map(s => s.id) } });

  await AppConfigModel.updateOne(
    { key: 'default' },
    { $set: { ...SEED_APP_CONFIG, contentUpdatedAt: now } },
    { upsert: true },
  );

  return { schemes: SEED_SCHEMES.length, eshramSteps: SEED_ESHRAM_STEPS.length };
}
