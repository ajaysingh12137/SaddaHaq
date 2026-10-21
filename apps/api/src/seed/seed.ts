import { AppConfigModel, EshramStepModel, SchemeModel } from '../models/content';
import { SEED_APP_CONFIG, SEED_ESHRAM_STEPS, SEED_SCHEMES } from './content';

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
  for (const scheme of SEED_SCHEMES) {
    await SchemeModel.updateOne({ slug: scheme.slug }, { $set: scheme }, { upsert: true });
  }
  await SchemeModel.deleteMany({ slug: { $nin: SEED_SCHEMES.map(s => s.slug) } });

  for (const step of SEED_ESHRAM_STEPS) {
    await EshramStepModel.updateOne({ slug: step.slug }, { $set: step }, { upsert: true });
  }
  await EshramStepModel.deleteMany({ slug: { $nin: SEED_ESHRAM_STEPS.map(s => s.slug) } });

  await AppConfigModel.updateOne(
    { key: 'default' },
    { $set: { ...SEED_APP_CONFIG, contentUpdatedAt: now } },
    { upsert: true },
  );

  return { schemes: SEED_SCHEMES.length, eshramSteps: SEED_ESHRAM_STEPS.length };
}
