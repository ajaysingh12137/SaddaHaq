import { useNetInfo } from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { Alert, type AlertButton, Linking, Share } from 'react-native';

import {
  type ContentResponse,
  type PlatformId,
  SEED_APP_CONFIG,
  SEED_ESHRAM_STEPS,
  SEED_SCHEMES,
  type User,
} from '@saddahaq/shared';

import App, { queryClient } from '../App';
import { __resetDatabaseForTests, openDatabase } from '../db/database';
import { listLiveLogs, setPlatformsForDate } from '../db/dayLogs';
import { kvGet, kvSet } from '../db/kv';
import { initI18n } from '../i18n';
import { loadTokens, saveTokens } from '../security/secureStore';
import { __useFetchForTests } from '../services/api';
import { resetLogsStore } from '../state/logsStore';
import { resetSessionStore } from '../state/sessionStore';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

let server: ReturnType<typeof createFakeServer>;
let alertSpy: jest.SpyInstance;

async function signedInWorker(overrides: Partial<User> = {}) {
  await openDatabase();
  await kvSet('settings.language', 'en');
  await kvSet('session.onboarded', true);
  await kvSet(
    'session.user',
    makeUser({
      platforms: ['zomato'] as PlatformId[],
      language: 'en',
      consents: { backup: true, analytics: false, acceptedAt: '2026-10-15T06:00:00.000Z' },
      ...overrides,
    }),
  );
  await saveTokens(TOKENS);
  __resetDatabaseForTests();
}

/** Presses the button labelled `text` in the last Alert shown. */
async function pressAlertButton(text: string) {
  const buttons = alertSpy.mock.calls.at(-1)?.[2] as AlertButton[];
  const button = buttons.find(b => b.text === text);
  expect(button).toBeDefined();
  await act(async () => {
    button?.onPress?.();
  });
}

async function openTab(name: string) {
  await fireEvent.press(screen.getByText(name));
}

beforeEach(async () => {
  resetSessionStore();
  resetLogsStore();
  __resetDatabaseForTests();
  queryClient.clear();
  queryClient.setDefaultOptions({
    queries: { gcTime: 0, retry: false },
    mutations: { gcTime: 0, retry: 0 },
  });
  await initI18n('en');
  server = createFakeServer();
  __useFetchForTests(server.fetchImpl);
  server.on('PATCH /me', body => ({ body: makeUser(body as object) }));
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.mocked(useNetInfo).mockReturnValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: null,
  } as unknown as ReturnType<typeof useNetInfo>);
  queryClient.clear();
});

describe('e-Shram guide', () => {
  it('walks through the steps, keeps the checklist, links out and records registration', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await signedInWorker();
    await render(<App />);

    await fireEvent.press(await screen.findByTestId('home-open-eshram'));
    expect(await screen.findByTestId('eshram-screen')).toBeTruthy();
    expect(screen.getByTestId('eshram-placeholder')).toBeTruthy();

    const total = SEED_ESHRAM_STEPS.length;
    expect(screen.getByTestId('eshram-step-count')).toHaveTextContent(`Step 1 of ${total}`);
    expect(screen.getByTestId('eshram-step-title')).toHaveTextContent(
      SEED_ESHRAM_STEPS[0]!.title.en,
    );
    expect(screen.getByTestId('eshram-prev').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    for (let i = 1; i < total; i++) {
      await fireEvent.press(screen.getByTestId('eshram-next'));
    }
    expect(screen.getByTestId('eshram-step-title')).toHaveTextContent(
      SEED_ESHRAM_STEPS[total - 1]!.title.en,
    );
    expect(screen.getByTestId('eshram-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    // Checklist is saved on the phone.
    await fireEvent.press(screen.getByTestId('eshram-check-bank'));
    await waitFor(async () =>
      expect(await kvGet('eshram.checklist')).toEqual({ mobile: false, bank: true }),
    );

    // Opens the official portal in the browser; nothing is embedded or filled in.
    await fireEvent.press(screen.getByTestId('eshram-open-portal'));
    expect(openURL).toHaveBeenCalledWith('https://eshram.gov.in');

    await fireEvent.press(screen.getByTestId('eshram-registered'));
    await waitFor(() =>
      expect(server.callsTo('PATCH /me').at(-1)?.body).toEqual({ eshramRegistered: true }),
    );

    // Back on Home, the registration prompt is gone.
    await fireEvent.press(screen.getByLabelText('Back'));
    await screen.findByTestId('home-screen');
    expect(screen.queryByTestId('home-eshram-card')).toBeNull();
  });

  it('explains when the browser cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    await signedInWorker();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-open-eshram'));
    await fireEvent.press(await screen.findByTestId('eshram-open-portal'));
    expect(await screen.findByText(/Visit eshram.gov.in in your browser/)).toBeTruthy();
  });
});

describe('schemes', () => {
  it('lists placeholder schemes offline from the bundled content and opens details', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Schemes');

    expect(await screen.findByTestId('schemes-screen')).toBeTruthy();
    expect(screen.getByText(/PLACEHOLDER — verify before launch/)).toBeTruthy();
    const first = SEED_SCHEMES[0]!;
    await fireEvent.press(screen.getByTestId(`scheme-${first.id}`));

    const detail = await screen.findByTestId('scheme-detail-screen');
    expect(within(detail).getByText(first.name.en)).toBeTruthy();
    expect(within(detail).getByText(first.covers.en)).toBeTruthy();
    expect(within(detail).getByText('Not added yet')).toBeTruthy();
    expect(screen.getByTestId('scheme-placeholder')).toBeTruthy();
    // No invented website or helpline.
    expect(screen.queryByTestId('scheme-open-website')).toBeNull();
    expect(screen.queryByTestId('scheme-call')).toBeNull();
    expect(screen.getByTestId('scheme-last-verified')).toHaveTextContent(
      'Last checked: 15 October 2026',
    );
  });

  it('shows fresh server content and uses the server thresholds on Home', async () => {
    const verified = {
      ...SEED_SCHEMES[0]!,
      name: { hi: 'सत्यापित योजना', en: 'Verified scheme' },
      placeholder: false,
      helpline: '1800 000 000',
      url: 'https://example.gov.in/scheme',
      lastVerified: '2026-10-18',
    };
    const content: ContentResponse = {
      schemes: [verified],
      eshramSteps: SEED_ESHRAM_STEPS,
      appConfig: { ...SEED_APP_CONFIG, singleThreshold: 100 },
      updatedAt: '2026-10-20T00:00:00.000Z',
    };
    server.on('GET /content', () => ({ body: content }));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await signedInWorker();
    await openDatabase();
    await setPlatformsForDate('2026-10-01', ['zomato']);
    __resetDatabaseForTests();
    await render(<App />);

    expect(await screen.findByTestId('meter-count')).toHaveTextContent('1/100');
    await openTab('Schemes');
    await fireEvent.press(await screen.findByTestId('scheme-' + verified.id));
    await screen.findByTestId('scheme-detail-screen');
    expect(screen.queryByTestId('scheme-placeholder')).toBeNull();
    await fireEvent.press(screen.getByTestId('scheme-call'));
    expect(openURL).toHaveBeenCalledWith('tel:1800000000');
    await fireEvent.press(screen.getByTestId('scheme-open-website'));
    expect(openURL).toHaveBeenCalledWith('https://example.gov.in/scheme');
  });
});

describe('settings', () => {
  it('switches language and read-aloud speed', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');

    await fireEvent.press(await screen.findByTestId('settings-speed-0.8'));
    await waitFor(async () => expect(await kvGet('settings.speechRate')).toBe(0.8));

    await fireEvent.press(screen.getByTestId('settings-language-hi'));
    // Screen title and tab label both switch to Hindi.
    expect(await screen.findAllByText('सेटिंग्स')).toHaveLength(2);
    expect(await kvGet('settings.language')).toBe('hi');
  });

  it('asks before turning backup off, then tells the server', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');

    await fireEvent.press(await screen.findByTestId('settings-backup'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Turn off online backup?',
      expect.any(String),
      expect.any(Array),
    );
    expect(server.callsTo('PATCH /me')).toHaveLength(0);
    await pressAlertButton('Turn off');
    await waitFor(() =>
      expect(server.callsTo('PATCH /me').at(-1)?.body).toMatchObject({
        consents: { backup: false, analytics: false },
      }),
    );
  });

  it('exports logs as CSV through the share sheet', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await signedInWorker();
    await openDatabase();
    await setPlatformsForDate('2026-10-01', ['zomato']);
    __resetDatabaseForTests();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');

    await fireEvent.press(await screen.findByTestId('settings-export'));
    expect(share).toHaveBeenCalledWith({
      title: 'Export my logs',
      message: 'date,app,source,amount\r\n2026-10-01,Zomato,tap,\r\n',
    });
  });

  it('says so instead of sharing an empty file', async () => {
    const share = jest.spyOn(Share, 'share');
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');
    await fireEvent.press(await screen.findByTestId('settings-export'));
    expect(await screen.findByTestId('settings-notice')).toHaveTextContent('No days logged yet.');
    expect(share).not.toHaveBeenCalled();
  });

  it('deletes the account on the server, wipes the phone and starts over', async () => {
    server.on('DELETE /me', () => ({ status: 204 }));
    await signedInWorker();
    await openDatabase();
    await setPlatformsForDate('2026-10-01', ['zomato']);
    __resetDatabaseForTests();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');

    await fireEvent.press(await screen.findByTestId('settings-delete'));
    expect(server.callsTo('DELETE /me')).toHaveLength(0);
    await pressAlertButton('Delete');

    expect(await screen.findByTestId('language-screen')).toBeTruthy();
    expect(server.callsTo('DELETE /me')).toHaveLength(1);
    expect(await loadTokens()).toBeNull();
    expect(await listLiveLogs()).toEqual([]);
    expect(await kvGet('session.user')).toBeNull();
  });

  it('keeps everything and explains when deleting offline', async () => {
    await signedInWorker();
    await render(<App />);
    await screen.findByTestId('home-screen');
    await openTab('Settings');
    jest.mocked(server.fetchImpl).mockRejectedValue(new TypeError('Network request failed'));

    await fireEvent.press(await screen.findByTestId('settings-delete'));
    await pressAlertButton('Delete');

    expect(await screen.findByTestId('settings-notice')).toHaveTextContent(
      'You need internet to delete your account.',
    );
    expect(await loadTokens()).toEqual(TOKENS);
    expect(screen.getByTestId('settings-screen')).toBeTruthy();
  });
});
