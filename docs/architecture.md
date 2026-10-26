# Architecture

The phone holds the worker's data; the server handles login, content and an
optional backup. Every screen except sign-in works offline.

```
Phone (React Native)                              API (Express + MongoDB, India region)
────────────────────                              ─────────────────────────────────────
Screens ──► Zustand stores ──► encrypted SQLite   POST /auth/otp/*  ── OTP provider (Textlocal / MSG91)
   │             (logs, session)   (source of truth)  GET  /content     ── schemes, e-Shram steps, appConfig
   │                                    │          POST /sync        ── backup copy of day logs
   ├─ OCR (ML Kit, on-device) ──► parser            PATCH/DELETE /me
   └─ TanStack Query ◄── /content (cached in SQLite, bundled fallback)
                         sync service ──► /sync (only with backup consent)
eshram.gov.in: opened in the browser only; no data passes to it.
```

## Data on the phone

- **Encrypted SQLite** (op-sqlite + SQLCipher). The key is random, kept in the
  Android Keystore via `react-native-keychain`. Tables: `kv` (settings, session,
  content cache, sync time, checklist) and `day_logs`.
- **Day logs:** one row per (date, platform), UUID v4 made on the phone,
  `updated_at`, soft-delete `deleted_at`, `synced` flag. See `src/db/dayLogs.ts`.
- **Screenshots** are downscaled by the picker, read by ML Kit, and the copy is
  deleted by the native module. The image and its text are never stored or sent.

## Content

`GET /content` returns everything in both languages. The app keeps the last copy in
SQLite and starts from it, or from the placeholder content bundled from
`packages/shared` on first launch. A refresh sends `since` and gets 304 when nothing
changed. `appConfig` thresholds drive the eligibility meter, so rule changes need
no app release.

## Sync (`src/services/sync.ts`)

Only when the worker turned on backup. Triggers: app open, after a log is saved, on
reconnect, and when backup is turned on. Steps:

1. Push any queued profile change first (a just-given backup consent must reach the
   server, or `/sync` answers 403).
2. Send up to 500 unsynced logs and the last server time; repeat until done.
3. Merge the server's changes (`applyServerChanges`): server id is canonical per
   (date, platform); a change the phone sent is settled by the server's echo unless
   edited again meanwhile; otherwise last write wins on `updatedAt`.
4. Failures retry with exponential backoff (2 s doubling to 5 min, 6 retries), then
   wait for the next trigger. 401/403 do not retry.

Turning backup off makes the server delete its copy. Turning it on again, or
signing in to an account, marks every local log unsynced and starts from scratch.

## Privacy controls

- Collected: phone number (server keeps an HMAC and the last 4 digits), language,
  platforms, consents, day logs (server copy only with backup on).
- Never collected: Aadhaar, bank details, platform passwords, contacts, location.
- Crash reports: only with the analytics consent; see `src/services/monitoring.ts`.
- Delete account: `DELETE /me` hard-deletes server data at once; the phone then
  deletes its database and key.
