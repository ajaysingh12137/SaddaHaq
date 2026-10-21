import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { launchImageLibrary } from 'react-native-image-picker';

import { type PlatformId, addDays } from '@saddahaq/shared';

import App, { queryClient } from '../App';
import { __resetDatabaseForTests, openDatabase } from '../db/database';
import { listLiveLogs, setPlatformsForDate } from '../db/dayLogs';
import { kvSet } from '../db/kv';
import { initI18n } from '../i18n';
import { readScreenshot } from '../ocr/readScreenshot';
import { saveTokens } from '../security/secureStore';
import { __useFetchForTests } from '../services/api';
import { resetLogsStore } from '../state/logsStore';
import { resetSessionStore } from '../state/sessionStore';
import NativeTextRecognizer from '../specs/NativeTextRecognizer';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

jest.mock('../specs/NativeTextRecognizer', () => ({
  __esModule: true,
  default: { recognize: jest.fn() },
}));

const recognize = jest.mocked(NativeTextRecognizer!.recognize);
const pickImage = jest.mocked(launchImageLibrary);

const TODAY = '2026-10-21';

/** A signed-in, onboarded worker on Zomato and Swiggy, using English. */
async function signedInWorker(platforms: PlatformId[] = ['zomato', 'swiggy']) {
  await openDatabase();
  await kvSet('settings.language', 'en');
  await kvSet('session.onboarded', true);
  await kvSet('session.user', makeUser({ platforms, language: 'en' }));
  await saveTokens(TOKENS);
  __resetDatabaseForTests();
}

/** Logs `count` consecutive days ending yesterday for one platform. */
async function seedDays(platform: PlatformId, count: number) {
  await openDatabase();
  for (let i = 1; i <= count; i++) {
    await setPlatformsForDate(addDays(TODAY, -i), [platform]);
  }
  __resetDatabaseForTests();
}

async function openTab(name: 'Home' | 'Log') {
  await fireEvent.press(screen.getByText(name));
}

beforeEach(async () => {
  // Only the clock is faked; timers stay real so async UI settles normally.
  jest.useFakeTimers({
    now: new Date(2026, 9, 21, 10, 0, 0),
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ],
  });
  resetSessionStore();
  resetLogsStore();
  __resetDatabaseForTests();
  queryClient.clear();
  queryClient.setDefaultOptions({
    queries: { gcTime: 0, retry: false },
    mutations: { gcTime: 0, retry: 0 },
  });
  await initI18n('en');
  __useFetchForTests(createFakeServer().fetchImpl);
  recognize.mockReset();
  pickImage.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
  queryClient.clear();
});

describe('Home: eligibility meter', () => {
  it('shows a friendly empty state with no logs', async () => {
    await signedInWorker();
    await render(<App />);
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText('No days logged yet — tap + to add today')).toBeTruthy();
    expect(screen.getByTestId('meter-record-note')).toBeTruthy();
  });

  it('shows progress on the closer path and the other path as secondary text', async () => {
    await signedInWorker();
    await seedDays('zomato', 64);
    await render(<App />);

    expect(await screen.findByTestId('meter-count')).toHaveTextContent('64/90');
    expect(screen.getByTestId('meter-status')).toHaveTextContent(
      '26 more days on Zomato to reach 90',
    );
    expect(screen.getByTestId('meter-secondary')).toHaveTextContent(
      'All apps together: 64 of 120 days',
    );
    // 21 Oct 2026 → 31 Mar 2027, counting today.
    expect(screen.getByTestId('meter-days-left')).toHaveTextContent('Days left in this year: 162');
    expect(within(screen.getByTestId('bar-zomato')).getByText('64/90')).toBeTruthy();
    expect(screen.queryByText(/likely eligible/i)).toBeNull();
  });

  it('says "likely eligible by your records", never just "eligible"', async () => {
    await signedInWorker();
    await seedDays('zomato', 90);
    await render(<App />);

    expect(await screen.findByTestId('meter-status')).toHaveTextContent(
      'Likely eligible by your records',
    );
    const mentions = screen.queryAllByText(/eligible/i);
    expect(mentions.length).toBeGreaterThan(0);
    for (const element of mentions) {
      expect(element).toHaveTextContent(/likely eligible by your records/i);
    }
  });
});

describe('Log: quick tap', () => {
  it('logs today from the calendar and updates the meter', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');

    const day = await screen.findByTestId(`day-${TODAY}`);
    expect(day.props.accessibilityLabel).toBe('21 October 2026, not logged');
    await fireEvent.press(day);

    const sheet = await screen.findByTestId('log-day-sheet');
    expect(within(sheet).getByText('21 October 2026')).toBeTruthy();
    // Only the worker's own apps at first; the rest behind "Show all apps".
    expect(screen.getByTestId('log-platform-zomato')).toBeTruthy();
    expect(screen.queryByTestId('log-platform-uber')).toBeNull();
    await fireEvent.press(screen.getByTestId('log-day-more'));
    expect(screen.getByTestId('log-platform-uber')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('log-platform-zomato'));
    await fireEvent.press(screen.getByTestId('log-platform-uber'));
    await fireEvent.press(screen.getByTestId('log-day-save'));

    await waitFor(() =>
      expect(screen.getByTestId(`day-${TODAY}`).props.accessibilityLabel).toBe(
        '21 October 2026, worked on Zomato, Uber',
      ),
    );
    expect((await listLiveLogs()).map(l => l.platform).sort()).toEqual(['uber', 'zomato']);

    await openTab('Home');
    // Two apps on one day: the combined path (2/120) is not closer than 1/90.
    expect(await screen.findByTestId('meter-count')).toHaveTextContent('1/90');
  });

  it('does not let the worker log a future date', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');
    const tomorrow = await screen.findByTestId(`day-${addDays(TODAY, 1)}`);
    expect(tomorrow.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('clears a logged day', async () => {
    await signedInWorker();
    await seedDays('swiggy', 1);
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');
    const yesterday = addDays(TODAY, -1);
    await fireEvent.press(await screen.findByTestId(`day-${yesterday}`));
    await fireEvent.press(await screen.findByTestId('log-day-clear'));
    await waitFor(() =>
      expect(screen.getByTestId(`day-${yesterday}`).props.accessibilityLabel).toBe(
        '20 October 2026, not logged',
      ),
    );
    expect(await listLiveLogs()).toEqual([]);
  });

  it('opens the same sheet for today from Home', async () => {
    await signedInWorker();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-log-today'));
    await fireEvent.press(await screen.findByTestId('log-platform-swiggy'));
    await fireEvent.press(screen.getByTestId('log-day-save'));
    expect(await screen.findByTestId('meter-count')).toHaveTextContent('1/90');
  });
});

describe('Log: screenshot', () => {
  const OCR_TEXT = ['Zomato', "Today's earnings", '₹ 850', 'Mon, 20 Oct'].join('\n');

  it('reads a screenshot on the phone, lets the worker correct it, and saves', async () => {
    await signedInWorker();
    pickImage.mockResolvedValue({ assets: [{ uri: 'file:///cache/shot.jpg' }] });
    recognize.mockResolvedValue(OCR_TEXT);
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');

    await fireEvent.press(await screen.findByTestId('log-screenshot'));
    await screen.findByTestId('ocr-sheet');

    // Downscaled, photos only, no base64 or EXIF.
    expect(pickImage).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'photo',
        maxWidth: 1080,
        maxHeight: 1920,
        includeBase64: false,
        includeExtra: false,
      }),
    );
    expect(recognize).toHaveBeenCalledWith('file:///cache/shot.jpg');

    expect(screen.getByTestId('ocr-platform-zomato').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(within(screen.getByTestId('ocr-date')).getByText('20 October 2026')).toBeTruthy();
    expect(screen.getByTestId('ocr-amount').props.value).toBe('850');

    // The worker corrects the amount and the date.
    await fireEvent.changeText(screen.getByTestId('ocr-amount'), '900');
    await fireEvent.press(screen.getByTestId('ocr-date-prev'));
    await fireEvent.press(screen.getByTestId('ocr-save'));

    await waitFor(() => expect(screen.queryByTestId('ocr-sheet')).toBeNull());
    expect(await listLiveLogs()).toEqual([
      expect.objectContaining({
        date: '2026-10-19',
        platform: 'zomato',
        source: 'ocr',
        amount: 900,
      }),
    ]);
  });

  it('leaves unreadable fields empty and asks for them before saving', async () => {
    await signedInWorker();
    pickImage.mockResolvedValue({ assets: [{ uri: 'file:///cache/shot.jpg' }] });
    recognize.mockResolvedValue('blurry nothing here');
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');
    await fireEvent.press(await screen.findByTestId('log-screenshot'));
    await screen.findByTestId('ocr-sheet');

    expect(screen.getByText('Date not found — choose one')).toBeTruthy();
    expect(screen.getByTestId('ocr-amount').props.value).toBe('');

    await fireEvent.press(screen.getByTestId('ocr-save'));
    expect(await screen.findByText('Choose the app.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ocr-platform-swiggy'));
    await fireEvent.press(screen.getByTestId('ocr-save'));
    expect(await screen.findByText('Choose the date.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('ocr-date-next'));
    await fireEvent.changeText(screen.getByTestId('ocr-amount'), 'abc');
    await fireEvent.press(screen.getByTestId('ocr-save'));
    expect(await screen.findByText('Enter the amount in numbers, or leave it empty.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('ocr-amount'), '');
    await fireEvent.press(screen.getByTestId('ocr-save'));

    await waitFor(() => expect(screen.queryByTestId('ocr-sheet')).toBeNull());
    expect(await listLiveLogs()).toEqual([
      expect.objectContaining({ date: TODAY, platform: 'swiggy', source: 'ocr', amount: null }),
    ]);
  });

  it('tells the worker when the OCR model is still downloading', async () => {
    await signedInWorker();
    pickImage.mockResolvedValue({ assets: [{ uri: 'file:///cache/shot.jpg' }] });
    recognize.mockRejectedValue(Object.assign(new Error('x'), { code: 'unavailable' }));
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Log');
    await fireEvent.press(await screen.findByTestId('log-screenshot'));
    expect(await screen.findByTestId('log-notice')).toHaveTextContent(
      /still being set up on your phone/,
    );
    expect(screen.queryByTestId('ocr-sheet')).toBeNull();
  });
});

describe('readScreenshot', () => {
  it('does nothing when the worker cancels the picker', async () => {
    pickImage.mockResolvedValue({ didCancel: true });
    expect(await readScreenshot(TODAY)).toEqual({ kind: 'cancelled' });
    expect(recognize).not.toHaveBeenCalled();
  });

  it('reports picker errors as failed', async () => {
    pickImage.mockResolvedValue({ errorCode: 'others', errorMessage: 'x' });
    expect(await readScreenshot(TODAY)).toEqual({ kind: 'failed' });
  });

  it('reports recognition errors as failed', async () => {
    pickImage.mockResolvedValue({ assets: [{ uri: 'file:///cache/a.jpg' }] });
    recognize.mockRejectedValue(Object.assign(new Error('boom'), { code: 'failed' }));
    expect(await readScreenshot(TODAY)).toEqual({ kind: 'failed' });
  });

  it('parses the recognised text with the shared parser', async () => {
    pickImage.mockResolvedValue({ assets: [{ uri: 'file:///cache/a.jpg' }] });
    recognize.mockResolvedValue('Rapido\nTotal earnings ₹1,240\n14/10/2026');
    expect(await readScreenshot(TODAY)).toEqual({
      kind: 'parsed',
      parsed: { platform: 'rapido', date: '2026-10-14', amount: 1240 },
    });
  });
});
