# SaddaHaQ API

Express 5 + Mongoose 9 + Zod. All request bodies are validated with the shared
schemas in `packages/shared/src/schemas.ts`. Errors are always
`{ "error": { "code", "message", "details?" } }`.

## Running locally

```sh
npm install
npm run dev          # API on http://localhost:4000
```

With `MONGO_URI` unset, `npm run dev` starts an **in-memory MongoDB** and seeds
placeholder content from `packages/shared/src/content/placeholder.ts` automatically
(data is lost on stop). The app bundles the same content as its offline fallback. OTPs are printed to the
server log by the console provider (`devOtp: "123456"`).

To use a real database, copy `apps/api/.env.example` to `apps/api/.env`, set
`MONGO_URI`, then `npm run seed`.

## Endpoints

| Method | Path                | Auth   | Notes |
| ------ | ------------------- | ------ | ----- |
| GET    | `/health`           | –      | 200 `{status, db, version}`; 503 if the DB is down |
| POST   | `/auth/otp/request` | –      | `{phone}` → 202 `{expiresInSec, resendAfterSec}`. Limits: 10/15 min per IP, 5/15 min per number, 60 s resend cooldown |
| POST   | `/auth/otp/verify`  | –      | `{phone, otp}` → `{accessToken, refreshToken, user}`. 5 wrong attempts lock the code |
| POST   | `/auth/refresh`     | –      | `{refreshToken}` → new pair; old token revoked. Reusing a revoked token revokes all sessions |
| POST   | `/auth/logout`      | –      | `{refreshToken}` → 204 |
| GET    | `/me`               | Bearer | Public profile |
| PATCH  | `/me`               | Bearer | Any of `language, platforms, eshramRegistered, consents`. Turning backup **off deletes server-side logs** |
| DELETE | `/me`               | Bearer | 204. Hard-deletes user, logs, tokens and OTPs; existing tokens stop working immediately |
| GET    | `/content`          | –      | `?since=<ISO>` → 304 if unchanged. Returns both `hi` and `en`; `lang` is accepted but optional |
| POST   | `/sync`             | Bearer | Requires backup consent (403 otherwise). See below |

Access tokens: HS256 JWT, 15 minutes. Refresh tokens: 256-bit random, 30 days,
stored as SHA-256, rotated on every use.

## Privacy

- Phone numbers are stored only as an HMAC (`PHONE_HASH_SECRET`) plus the last 4
  digits. OTPs are stored as an HMAC bound to the phone hash.
- Request logs contain method, path and status only. Known sensitive fields are
  redacted and Indian mobile numbers are masked in any log message.
- Sentry (optional) is configured to collect no user info, headers, cookies,
  bodies or query strings.

## Sync contract

`POST /sync { changes: DayLog[], since: ISO | null }` → `{ serverChanges, now }`

- Store `now` and send it as `since` next time. It is rewound by 5 s so writes
  racing a sync are never missed — the client may see a log twice; merging is idempotent.
- Last write wins on the client `updatedAt` (clamped to server time + 5 min).
- One log per (date, platform). If the server already has a log for that pair
  under another id, the change is applied to it and **the server id is canonical**:
  the client must replace its local row with the server row of the same (date, platform).
- A log's (date, platform) never changes. To "move" a log, soft-delete it and
  add (or undelete) the other one.
- Every log touched by an incoming change is echoed in `serverChanges`.
- Max 500 changes per request.

## Known limitations

- Rate limits are kept in process memory: running several API instances needs a
  shared store (e.g. Redis).
- Tests run Jest with `--experimental-vm-modules` to work around an upstream
  MongoDB driver regression (≥ 7.6) under Jest, tracked as NODE-7832. Remove once fixed.
