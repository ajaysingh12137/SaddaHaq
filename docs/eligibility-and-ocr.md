# Eligibility meter and screenshot parser

Both live in `packages/shared` so the app and the API use identical logic.

## Eligibility (`src/eligibility.ts`)

The rule as provided in the product brief (verify against the notified Social
Security (Central) Rules before launch — thresholds are server-configurable via
`appConfig`):

- **Single path:** at least `singleThreshold` (90) distinct dates on one platform.
- **Multi path:** at least `multiThreshold` (120) platform-days across platforms.
  Working 3 platforms on one date counts as 3.
- Only logs inside the selected financial year (default 1 April – 31 March,
  `fyStartMonth` = 4) count. Soft-deleted logs and malformed dates are ignored.
  Duplicate `(date, platform)` pairs count once.

`computeEligibility(logs, config, { today, fyStartYear? })` returns per-platform
counts, both paths' progress, `likelyEligible`, the `primaryPath` for the main
ring, days left in the FY, and a `status` code for the one-line message:

| status            | meaning                                          |
| ----------------- | ------------------------------------------------ |
| `likely_eligible` | either path met — UI says "likely eligible by your records" |
| `fy_ended`        | a past FY that was not met                       |
| `no_logs`         | nothing logged in this FY yet                    |
| `in_progress`     | some days logged, neither path met               |

**Primary path** ("closer to its target"): fewer days still needed wins. If equal,
the higher days/target ratio wins (relevant once both are met). If still equal,
multi when several platforms are logged, else single.

**Single-path platform tie:** the alphabetically first platform id, so results are
deterministic.

The app must never state that a worker *is* eligible: official eligibility is
decided by the government from platform-reported data.

## Screenshot parser (`src/ocr/parser.ts`)

`parseEarningsText(text, { today })` → `{ platform, date, amount }`, any of which
may be `null` for the worker to fill in.

- **Platform:** keyword match (`PLATFORMS[*].keywords`), whole-word for Latin
  keywords. Most mentions wins; ties go to the earliest mention.
- **Amount:** `₹`, `Rs`, `Rs.`, `INR` followed by a number (Indian grouping
  allowed). An amount labelled by a keyword (total earnings > earnings > earned >
  payout > total > कमाई…) on the same line, the line above, or the line below wins.
  With no labelled amount, a single distinct amount is used; otherwise `null`. Lines
  labelled incentive, bonus, tip, toll, cash collected, deduction or penalty never count
  for that fallback.
- **Known OCR misread (seen on a phone):** ML Kit read a large `₹1,245.50` as
  `21,245.50`, dropping the ₹ sign. The amount is then left empty rather than guessed
  (fixture `zomato-rupee-misread`). Check real screenshots for this before tuning further.
- **Date:** the first valid explicit date — `14/10/2026`, `14-10-26`,
  `2026-10-14`, `14 Oct`, `14th October 2026`, `Oct 14, 2026`. Day-first numeric
  dates are assumed (Indian convention). A year-less date resolves to the most
  recent such date on or before today. "Today"/"Yesterday"/"आज" are used only
  when there is no explicit date, because they often appear in headings.

Fixtures in `src/__tests__/fixtures/ocr/` are synthetic; extend them with
anonymised real OCR output during field testing.

## On-device OCR (`apps/mobile`)

Screenshots are read by a small app-local TurboModule, not an npm wrapper:

- JS spec: `apps/mobile/src/specs/NativeTextRecognizer.ts` (codegen, `codegenConfig` in
  `apps/mobile/package.json`).
- Android: `android/app/src/main/java/com/saddahaq/ocr/`. Runs Google ML Kit's Latin and
  Devanagari recognisers off the JS thread and joins their text.
- Models come from Google Play services (`play-services-mlkit-text-recognition*`), about
  260 KB per script in the APK instead of about 4 MB per script per ABI when bundled
  (figures from Google's ML Kit docs). The manifest's `com.google.mlkit.vision.DEPENDENCIES`
  meta-data asks Play to download them at install. Until a model is ready, recognition
  fails with `unavailable` and the app tells the worker to log by tapping.
- The picker (`react-native-image-picker`) returns a copy downscaled to at most
  1080×1920. The native module deletes that copy from the app cache after reading it. It
  also deletes every other `rn_image_picker_lib_temp_*` file in the cache: version 8.3.0
  also leaves a full-size copy of the original there on every pick (found on a phone). It
  never touches gallery files. The recognised text is parsed in memory and never stored.
- iOS has no implementation yet; the app reports screenshot reading as unsupported there.
