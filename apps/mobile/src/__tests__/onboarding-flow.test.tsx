import { useNetInfo } from '@react-native-community/netinfo';
import Speech from '@mhpdev/react-native-speech';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import App, { queryClient } from '../App';
import { __resetDatabaseForTests } from '../db/database';
import { initI18n } from '../i18n';
import { __useFetchForTests } from '../services/api';
import { resetSessionStore } from '../state/sessionStore';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

let server: ReturnType<typeof createFakeServer>;

const ONLINE = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: null,
} as unknown as ReturnType<typeof useNetInfo>;

afterEach(() => {
  jest.mocked(useNetInfo).mockReturnValue(ONLINE);
  // Drop TanStack Query's cache timers so Jest can exit cleanly.
  queryClient.clear();
});

beforeEach(async () => {
  resetSessionStore();
  __resetDatabaseForTests();
  queryClient.clear();
  // Finished mutations otherwise schedule 5-minute GC timers that keep Jest alive.
  queryClient.setDefaultOptions({
    queries: { gcTime: 0, retry: false },
    mutations: { gcTime: 0, retry: 0 },
  });
  await initI18n('hi');
  server = createFakeServer();
  __useFetchForTests(server.fetchImpl);
  server.on('POST /auth/otp/request', () => ({
    status: 202,
    body: { expiresInSec: 300, resendAfterSec: 60 },
  }));
  server.on('POST /auth/otp/verify', () => ({ body: { ...TOKENS, user: makeUser() } }));
  server.on('PATCH /me', body => ({ body: makeUser(body as object) }));
});

/** Every touchable control must announce itself to screen readers. */
function expectAllControlsLabelled() {
  for (const role of ['button', 'checkbox', 'switch', 'radio'] as const) {
    for (const element of screen.queryAllByRole(role)) {
      expect(element.props.accessibilityLabel).toEqual(expect.any(String));
      expect((element.props.accessibilityLabel as string).length).toBeGreaterThan(0);
    }
  }
}

describe('onboarding', () => {
  it('takes a new worker from language choice to Home', async () => {
    await render(<App />);

    // 1. Language — Hindi is the default.
    expect(await screen.findByTestId('language-screen')).toBeTruthy();
    expect(screen.getByText('अपनी भाषा चुनें')).toBeTruthy();
    expectAllControlsLabelled();
    await fireEvent.press(screen.getByTestId('language-continue'));

    // 2. Phone
    expect(await screen.findByTestId('phone-screen')).toBeTruthy();
    expectAllControlsLabelled();
    await fireEvent.changeText(screen.getByTestId('phone-input'), '98765 43210');
    await fireEvent.press(screen.getByTestId('phone-send'));

    // 3. OTP — submits automatically on the 6th digit.
    expect(await screen.findByTestId('otp-screen')).toBeTruthy();
    expect(server.callsTo('POST /auth/otp/request')[0]?.body).toEqual({ phone: '9876543210' });
    expectAllControlsLabelled();
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');

    // 4. Platforms
    expect(await screen.findByTestId('platforms-screen')).toBeTruthy();
    expectAllControlsLabelled();
    await fireEvent.press(screen.getByTestId('platform-uber'));
    await fireEvent.press(screen.getByTestId('platform-zomato'));
    await fireEvent.press(screen.getByTestId('platforms-continue'));

    // 5. Consent — both toggles start off.
    expect(await screen.findByTestId('consent-screen')).toBeTruthy();
    expectAllControlsLabelled();
    expect(screen.getByTestId('consent-backup').props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(screen.getByTestId('consent-analytics').props.accessibilityState).toMatchObject({
      checked: false,
    });
    await fireEvent.press(screen.getByTestId('consent-agree'));

    // 6. Home
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.getByText('अभी कोई दिन नहीं जोड़ा — आज जोड़ने के लिए + दबाएँ')).toBeTruthy();

    await waitFor(() => expect(server.callsTo('PATCH /me').length).toBeGreaterThan(0));
    expect(server.callsTo('PATCH /me').at(-1)?.body).toMatchObject({
      language: 'hi',
      // Canonical order, not tap order.
      platforms: ['zomato', 'uber'],
      consents: { backup: false, analytics: false },
    });
  });

  it('switches the whole UI to English', async () => {
    await render(<App />);
    await screen.findByTestId('language-screen');
    await fireEvent.press(screen.getByTestId('language-en'));
    expect(await screen.findByText('Choose your language')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('language-continue'));
    expect(await screen.findByText('Your mobile number')).toBeTruthy();
  });

  it('rejects an invalid phone number without calling the server', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await screen.findByTestId('phone-screen');
    await fireEvent.changeText(screen.getByTestId('phone-input'), '12345');
    await fireEvent.press(screen.getByTestId('phone-send'));
    expect(await screen.findByText('10 अंकों का सही मोबाइल नंबर डालें।')).toBeTruthy();
    expect(server.callsTo('POST /auth/otp/request')).toHaveLength(0);
  });

  it('test login: shows the fixed code and fills it in with one tap', async () => {
    server.on('POST /auth/otp/request', () => ({
      status: 202,
      body: { expiresInSec: 300, resendAfterSec: 60, testCode: '123456' },
    }));
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await fireEvent.changeText(await screen.findByTestId('phone-input'), '9876543210');
    await fireEvent.press(screen.getByTestId('phone-send'));
    expect(await screen.findByTestId('otp-test-mode')).toHaveTextContent(/123456/);
    await fireEvent.press(screen.getByTestId('otp-use-test-code'));
    expect(await screen.findByTestId('platforms-screen')).toBeTruthy();
    expect(server.callsTo('POST /auth/otp/verify')[0]?.body).toEqual({
      phone: '9876543210',
      otp: '123456',
    });
  });

  it('hides the test-login hint for real SMS logins', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await fireEvent.changeText(await screen.findByTestId('phone-input'), '9876543210');
    await fireEvent.press(screen.getByTestId('phone-send'));
    await screen.findByTestId('otp-screen');
    expect(screen.queryByTestId('otp-test-mode')).toBeNull();
  });

  it('shows the server error for a wrong code', async () => {
    server.on('POST /auth/otp/verify', () => ({
      status: 400,
      body: { error: { code: 'otp_invalid', message: 'x' } },
    }));
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await fireEvent.changeText(await screen.findByTestId('phone-input'), '9876543210');
    await fireEvent.press(screen.getByTestId('phone-send'));
    await fireEvent.changeText(await screen.findByTestId('otp-input'), '000000');
    expect(await screen.findByText('कोड गलत है या उसका समय खत्म हो गया।')).toBeTruthy();
  });

  it('blocks sign-in while offline and says why', async () => {
    jest.mocked(useNetInfo).mockReturnValue({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
      details: null,
    } as unknown as ReturnType<typeof useNetInfo>);

    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await screen.findByTestId('phone-screen');
    expect(screen.getByTestId('offline-banner')).toBeTruthy();
    expect(screen.getByText('साइन इन के लिए इंटरनेट चाहिए।')).toBeTruthy();
    expect(screen.getByTestId('phone-send').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('reads the consent text aloud in Hindi', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('language-continue'));
    await fireEvent.changeText(await screen.findByTestId('phone-input'), '9876543210');
    await fireEvent.press(screen.getByTestId('phone-send'));
    await fireEvent.changeText(await screen.findByTestId('otp-input'), '123456');
    await fireEvent.press(await screen.findByTestId('platform-ola'));
    await fireEvent.press(screen.getByTestId('platforms-continue'));
    await fireEvent.press(await screen.findByTestId('consent-read-aloud'));

    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    const [text, options] = jest.mocked(Speech.speak).mock.calls.at(-1) as [
      string,
      { language: string },
    ];
    expect(options.language).toBe('hi-IN');
    expect(text).toContain('आधार');
  });
});
