import { userSchema } from '@saddahaq/shared';

import { OtpModel, RefreshTokenModel } from '../models/auth';
import { DayLogModel } from '../models/day-log';
import { UserModel } from '../models/user';
import { purgePendingDeletions } from '../modules/users/service';
import {
  OTHER_PHONE,
  type Session,
  type TestHarness,
  createHarness,
  login,
  useTestDatabase,
} from './helpers/setup';

useTestDatabase();

let h: TestHarness;
let session: Session;
beforeEach(async () => {
  h = createHarness();
  session = await login(h);
});

const log = (date: string, platform = 'zomato') => ({
  id: crypto.randomUUID(),
  date,
  platform,
  source: 'tap',
  amount: null,
  updatedAt: '2026-10-15T05:00:00.000Z',
  deletedAt: null,
});

async function enableBackupAndSync(s: Session, dates: string[]) {
  await h.agent
    .patch('/me')
    .set(s.auth)
    .send({ consents: { backup: true, analytics: false, acceptedAt: null } })
    .expect(200);
  await h.agent
    .post('/sync')
    .set(s.auth)
    .send({ changes: dates.map(d => log(d)), since: null })
    .expect(200);
}

describe('GET /me', () => {
  it('returns the public profile', async () => {
    const res = await h.agent.get('/me').set(session.auth).expect(200);
    expect(userSchema.parse(res.body).id).toBe(session.userId);
    expect(res.body).not.toHaveProperty('phoneHash');
  });
});

describe('PATCH /me', () => {
  it('updates language, platforms and e-Shram status', async () => {
    const res = await h.agent
      .patch('/me')
      .set(session.auth)
      .send({ language: 'en', platforms: ['zomato', 'uber'], eshramRegistered: true })
      .expect(200);
    expect(res.body).toMatchObject({
      language: 'en',
      platforms: ['zomato', 'uber'],
      eshramRegistered: true,
    });
  });

  it('records consent time from the server clock', async () => {
    const res = await h.agent
      .patch('/me')
      .set(session.auth)
      .send({ consents: { backup: true, analytics: true, acceptedAt: '2000-01-01T00:00:00.000Z' } })
      .expect(200);
    expect(res.body.consents).toEqual({
      backup: true,
      analytics: true,
      acceptedAt: h.clock.now().toISOString(),
    });
  });

  it.each([
    ['an unknown field', { phoneHash: 'x' }],
    ['an unknown platform', { platforms: ['dunzo'] }],
    ['duplicate platforms', { platforms: ['ola', 'ola'] }],
    ['an unknown language', { language: 'ta' }],
  ])('rejects %s', async (_label, body) => {
    const res = await h.agent.patch('/me').set(session.auth).send(body).expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('deletes server-side logs when backup is turned off', async () => {
    await enableBackupAndSync(session, ['2026-10-01', '2026-10-02']);
    expect(await DayLogModel.countDocuments()).toBe(2);

    await h.agent
      .patch('/me')
      .set(session.auth)
      .send({ consents: { backup: false, analytics: false, acceptedAt: null } })
      .expect(200);
    expect(await DayLogModel.countDocuments()).toBe(0);
  });

  it('keeps logs when consents are re-sent with backup still on', async () => {
    await enableBackupAndSync(session, ['2026-10-01']);
    await h.agent
      .patch('/me')
      .set(session.auth)
      .send({ consents: { backup: true, analytics: true, acceptedAt: null } })
      .expect(200);
    expect(await DayLogModel.countDocuments()).toBe(1);
  });
});

describe('DELETE /me', () => {
  it('hard-deletes the user and all their data, leaving other users alone', async () => {
    const other = await login(h, OTHER_PHONE);
    await enableBackupAndSync(session, ['2026-10-01', '2026-10-02']);
    await enableBackupAndSync(other, ['2026-10-03']);
    // An outstanding OTP for the deleted user's number.
    await h.agent.post('/auth/otp/request').send({ phone: '9876543210' }).expect(202);

    await h.agent.delete('/me').set(session.auth).expect(204);

    expect(await UserModel.exists({ _id: session.userId })).toBeNull();
    expect(await DayLogModel.countDocuments({ userId: session.userId })).toBe(0);
    expect(await RefreshTokenModel.countDocuments({ userId: session.userId })).toBe(0);
    expect(await OtpModel.countDocuments()).toBe(0);

    expect(await UserModel.exists({ _id: other.userId })).not.toBeNull();
    expect(await DayLogModel.countDocuments({ userId: other.userId })).toBe(1);
  });

  it('invalidates the still-unexpired access and refresh tokens', async () => {
    await h.agent.delete('/me').set(session.auth).expect(204);
    await h.agent.get('/me').set(session.auth).expect(401);
    await h.agent.post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('lets the same number sign up again as a fresh account', async () => {
    await h.agent.delete('/me').set(session.auth).expect(204);
    const again = await login(h);
    expect(again.userId).not.toBe(session.userId);
  });
});

describe('purgePendingDeletions', () => {
  it('finishes deletions that were interrupted', async () => {
    await enableBackupAndSync(session, ['2026-10-01']);
    await UserModel.updateOne({ _id: session.userId }, { $set: { deletingAt: new Date() } });

    // A user marked as deleting can no longer authenticate.
    await h.agent.get('/me').set(session.auth).expect(401);

    expect(await purgePendingDeletions(h.ctx)).toBe(1);
    expect(await UserModel.countDocuments()).toBe(0);
    expect(await DayLogModel.countDocuments()).toBe(0);
    expect(await purgePendingDeletions(h.ctx)).toBe(0);
  });
});
