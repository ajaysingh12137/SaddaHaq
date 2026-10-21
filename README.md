# SaddaHaQ

Helps India's gig and platform workers register on e-Shram, log their working
days per platform, and track progress toward social-security eligibility.

> Status: Phase 5 of 6 — shared logic, API, onboarding, day logging, screenshot OCR, the
> eligibility meter, e-Shram guide, schemes and settings are done. Sync and release follow.
>
> All scheme and e-Shram content is PLACEHOLDER (`packages/shared/src/content/placeholder.ts`).
> Replace it with text checked against the official portal before any worker uses the app.

## Layout

| Path              | What                                                            |
| ----------------- | --------------------------------------------------------------- |
| `apps/mobile`     | React Native app (Android first)                                |
| `apps/api`        | Express + MongoDB API — see [docs/api.md](docs/api.md)          |
| `packages/shared` | Types, Zod schemas, eligibility logic, OCR text parser          |
| `docs/`           | Architecture and design notes                                   |

## Quick start (all platforms)

Requires Node 22.11+ (24 LTS recommended, see `.nvmrc`).

```sh
npm install
npm run lint
npm run typecheck
npm test
```

## Scripts

| Script               | Does                                                 |
| -------------------- | ---------------------------------------------------- |
| `npm run lint`       | ESLint across all workspaces                         |
| `npm run format`     | Prettier write (`format:check` in CI)                |
| `npm run typecheck`  | Builds `shared`, then `tsc --noEmit` in each package |
| `npm test`           | Jest in every workspace (shared runs with coverage)  |
| `npm run dev`        | API in watch mode; in-memory MongoDB if no MONGO_URI |
| `npm run seed`       | Seed content and app config into MONGO_URI           |
| `npm run mobile`     | Start Metro                                          |
| `npm run android`    | Build and run the Android app                        |

See [docs/eligibility-and-ocr.md](docs/eligibility-and-ocr.md) for the eligibility rules and screenshot parser.
