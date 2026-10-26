# SaddaHaQ

Helps India's gig and platform workers register on e-Shram, log their working
days per platform, and track progress toward social-security eligibility.

> **Status: MVP code complete (phases 0–6). Not ready for workers yet.**
> All scheme and e-Shram content is PLACEHOLDER
> (`packages/shared/src/content/placeholder.ts`). Replace it with text checked
> against the official portal, and get the legal review listed below, before any
> worker uses the app.

The app only ever says a worker is _likely eligible by your records_. Official
eligibility is decided by the government from data platforms report to e-Shram.

## Layout

| Path              | What                                                                     |
| ----------------- | ------------------------------------------------------------------------ |
| `apps/mobile`     | React Native CLI app (Android first, new architecture, Hermes)           |
| `apps/api`        | Express + MongoDB API — see [docs/api.md](docs/api.md)                   |
| `packages/shared` | Types, Zod schemas, eligibility rules, OCR text parser, placeholder content |
| `docs/`           | [Architecture](docs/architecture.md), [eligibility and OCR](docs/eligibility-and-ocr.md), [API](docs/api.md) |

## Set up your machine

You need these on Windows, macOS and Linux alike:

1. **Node.js** 22.11 or newer (24 LTS recommended; see `.nvmrc`).
2. **Android Studio**, with an Android SDK and an emulator (a Pixel-sized device with
   Google Play services, so on-device OCR models can download). Follow React Native's
   "Set up your environment" guide for React Native CLI, Android target, for your OS.
3. **A JDK.** Android Studio's bundled JDK works (we build with it). Point
   `JAVA_HOME` at it:
   - Windows (PowerShell): `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"`
   - macOS: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
   - Linux: `export JAVA_HOME="$HOME/android-studio/jbr"` (wherever you unpacked it)
4. **`ANDROID_HOME`** set to your SDK, or `apps/mobile/android/local.properties`
   containing `sdk.dir=...` (Android Studio writes this when you open the project).
5. **iOS only (optional, macOS):** Xcode and CocoaPods; then
   `cd apps/mobile/ios && pod install`. iOS builds but is not polished, and has no OCR.

Windows note: if git reports "dubious ownership" for the repo folder, run
`git config --global --add safe.directory "<repo path>"` once.

## Run locally

```sh
npm install

# 1. API on http://localhost:4000. With MONGO_URI unset it uses an in-memory
#    MongoDB with placeholder content, and prints OTPs to the console.
npm run dev

# 2. In a second terminal: Metro
cp apps/mobile/.env.example apps/mobile/.env      # Windows: copy apps\mobile\.env.example apps\mobile\.env
npm run mobile

# 3. In a third terminal: build and start the app on the emulator
npm run android
```

`API_URL` in `apps/mobile/.env` defaults to `http://10.0.2.2:4000` (the emulator's
address for your computer). For a real phone (USB or wireless debugging), the simplest
is to forward the ports and use `localhost`:

```sh
adb reverse tcp:4000 tcp:4000   # API
adb reverse tcp:8081 tcp:8081   # Metro
# apps/mobile/.env: API_URL=http://localhost:4000
```

Repeat `adb reverse` after reconnecting the phone. After changing `.env`, restart Metro
with a clean cache: `cd apps/mobile && npx react-native start --reset-cache`
(`npm run mobile -- --reset-cache` does not pass the flag through).

To use a real database, copy `apps/api/.env.example` to `apps/api/.env`, set
`MONGO_URI`, `JWT_ACCESS_SECRET` and `PHONE_HASH_SECRET`, then run `npm run seed`.
URL-encode special characters in the database password (`@` becomes `%40`). In Atlas,
allow your IP under Network Access. Keep real values out of `.env.example`: it is in git.

**Test login (no SMS):** set `OTP_PROVIDER=fixed` in `apps/api/.env`. Every number signs in
with `123456` (`FIXED_OTP_CODE`) and the app offers to fill it in. A production server refuses
this unless `ALLOW_TEST_LOGIN=true`; never leave it on for real workers.

Real SMS: set `OTP_PROVIDER=textlocal` (or `msg91`) and that provider's variables in
`apps/api/.env`. For Textlocal, `TEXTLOCAL_MESSAGE` must be the DLT-approved template
text exactly, with `{otp}` where the code goes.

## Checks

| Script               | Does                                                   |
| -------------------- | ------------------------------------------------------ |
| `npm run lint`       | ESLint across all workspaces                           |
| `npm run format`     | Prettier write (`format:check` runs in CI)             |
| `npm run typecheck`  | Builds `shared`, then `tsc --noEmit` in each workspace |
| `npm test`           | Jest everywhere; `shared` enforces coverage (100% on eligibility and FY rules) |

CI (`.github/workflows/ci.yml`) runs lint, format check, type-check and tests on
every push to `main` and every pull request. It does not build the Android app.

## Build a release

### 1. One-time: an upload key

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore saddahaq-upload.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Keep the `.jks` file and its passwords safe and **outside git** (`*.jks` is ignored).
Then create `apps/mobile/android/keystore.properties` (also ignored):

```properties
storeFile=../../saddahaq-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

`storeFile` is relative to `apps/mobile/android/app`. Without this file, release
builds are signed with the debug key: they run on your phone, but Play rejects them.

### 2. Production settings

- `apps/mobile/.env`: `API_URL=https://<your API>` (HTTPS; release builds block
  plain HTTP) and, optionally, `SENTRY_DSN`. These are baked into the JS bundle.
- `apps/mobile/package.json` `version` is the app's `versionName`. Keep
  `APP_VERSION` in `src/config/version.ts` equal to it (a test enforces this).

### 3. Build

```sh
cd apps/mobile/android
./gradlew bundleRelease -PversionCode=1 -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
#   → app/build/outputs/bundle/release/app-release.aab   (upload to the Play internal testing track)

./gradlew assembleRelease -PsplitApks -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
#   → app/build/outputs/apk/release/app-<abi>-release.apk (one per CPU type, for sideloaded beta phones)
```

Run the two commands separately: the Android Gradle plugin refuses ABI splits and an
AAB in one run. On Windows use `gradlew.bat`. Increase `-PversionCode` for every Play upload. Release
builds use Hermes, R8 code shrinking and resource shrinking. The AAB lets Play deliver
only the parts a phone needs.

## Placeholders to replace before launch

| What | Where |
| ---- | ----- |
| All 5 schemes (names, cover, who qualifies, documents, where to apply). No helplines, URLs or amounts are filled in on purpose | `packages/shared/src/content/placeholder.ts` → `npm run seed` |
| All 8 e-Shram steps, each checked against the live portal | same file |
| Illustrations for e-Shram steps (currently icons) | `apps/mobile/src/features/eshram/EshramGuideScreen.tsx` (`ILLUSTRATIONS`) |
| Hindi copy: native-speaker review of every string | `apps/mobile/src/i18n/locales/hi.json`, `placeholder.ts` |
| Eligibility rule text and thresholds (90 / 120 / April) against the notified rules | `appConfig` via seed; `home.rule` string |
| OCR parser tuned on real screenshots (current fixtures are made up) | `packages/shared/src/__tests__/fixtures/ocr/` |
| SMS provider: Textlocal API key, sender and the exact DLT template text (or MSG91). Turn off the `fixed` test login | `apps/api/.env` (`OTP_PROVIDER=textlocal`) |
| MongoDB Atlas cluster in an India region; production secrets | `apps/api/.env` |
| Sentry DSNs (optional) and source-map upload (see below) | `apps/mobile/.env`, `apps/api/.env` |
| Upload keystore | `apps/mobile/android/keystore.properties` |
| App icon, name and Play Store listing | `android/app/src/main/res`, Play Console |
| Privacy policy text and its URL in the Play listing | not in the repo |

**Sentry source maps:** the `@sentry/cli` install script was blocked by npm's
install-script policy, and `sentry.gradle` is not applied. Crash reports work, but
JS stack traces stay minified until you add Sentry's Gradle step and an auth token.

## Assumptions made while building

- **The rule:** 90 engagement days on one platform, or 120 across all platforms (3 apps on
  one date = 3), in a financial year starting 1 April. This is taken from the brief, not from
  the notified rules text. The meter shows the current year; thresholds and FY start month
  come from the server.
- **"Days left"** counts today. A date belongs to the worker's local calendar.
- **OCR** uses our own Kotlin module with Google ML Kit (Latin + Devanagari) via Google Play
  services: phones without Play services cannot read screenshots, and can still log by
  tapping. The manifest value `ocr_devanagari` that pre-downloads the Hindi model is our
  reading of Google's docs.
- **Icons** come from `@react-native-vector-icons/material-design-icons` 13.1.5 (static font,
  about 1.3 MB). The app maps its own icon names to glyphs in `src/components/Icon.tsx`.
- **Read-aloud** uses `@mhpdev/react-native-speech` (the phone's own TTS), not
  `react-native-tts`. Offline it needs the phone's Hindi voice data; on the test phone
  Google TTS used its online voice first and then started downloading the offline one.
- **Hindi line height** on Android comes from the Noto Sans Devanagari font, not a fixed
  `lineHeight`: with one set, React Native measured short Hindi labels too narrow and
  cut their last word (seen on a Redmi phone, Android 15).
- **Backup** is opt-in. Turning it off makes the server delete its copy; turning it on
  again re-sends everything from the phone. Sync is last-write-wins per log. The server's
  id wins when two phones logged the same date and app.
- **Crash reports** (Sentry) only run when the worker turns on "Share anonymous usage
  data", which is off by default. They collect no user, request, screenshot or screen
  data, and phone numbers are masked.
- **Account deletion** needs internet: the server deletes first, then the phone is wiped.
  Signing out (not exposed in the UI yet) keeps the worker's logs on the phone.
- **CSV export** is shared as text through the system share sheet, not as a file.
- **Nearest CSC** is a text tip only; the app never asks for location.
- **iOS** is buildable but has no OCR, no bundled Noto fonts and no polish.
- **Size:** release APKs (Hermes, R8, ARM only) are 32.7 MB (arm64-v8a) and 25.7 MB
  (armeabi-v7a) on disk. Native libraries and the JS bundle are stored uncompressed so
  Android can map them; compressed, they come to about 13.9 MB and 12.5 MB. That is our
  gzip estimate of the download, not Play's figure: check "download size" in Play
  Console after the first upload. The largest parts are React Native (6.6 MB), the JS
  bundle (5.7 MB) and OpenSSL for the database encryption (4.8 MB).
- **Cold start** (2.5 s budget) has not been measured on a phone. The OCR module loads only
  when first used and Metro inlines requires; measure on the phones seen in field research.
- **Tested on one real phone** (Xiaomi 2311DRN14I, Android 15, debug build): login, onboarding,
  logging, screenshot OCR, offline logging and sync, e-Shram guide, schemes, read-aloud,
  CSV and account deletion. The system photo picker on that phone needed an extra "Done"
  tap, although the app asks for a single image. Google ML Kit keeps its own usage-event
  log in app storage; check what it sends before writing the privacy policy.
- **Permissions:** `react-native-keychain` adds `USE_BIOMETRIC` / `USE_FINGERPRINT` to the
  manifest, although the app uses no biometrics. Removing them needs a device test first.
