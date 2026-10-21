/* global jest */

jest.mock('@op-engineering/op-sqlite', () => require('./op-sqlite-mock'));

jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
    setGenericPassword: jest.fn(async (username, password, options = {}) => {
      store.set(options.service ?? 'default', { username, password });
      return { service: options.service };
    }),
    getGenericPassword: jest.fn(
      async (options = {}) => store.get(options.service ?? 'default') ?? false,
    ),
    resetGenericPassword: jest.fn(async (options = {}) =>
      store.delete(options.service ?? 'default'),
    ),
    __reset: () => store.clear(),
  };
});

jest.mock('@mhpdev/react-native-speech', () => {
  const listeners = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    default: {
      speak: jest.fn(async () => 'utterance-id'),
      stop: jest.fn(async () => {}),
      isSpeaking: jest.fn(async () => false),
      getAvailableVoices: jest.fn(async () => [
        { identifier: 'hi', name: 'Hindi', language: 'hi-IN' },
      ]),
      openVoiceDataInstaller: jest.fn(async () => {}),
      onFinish: jest.fn(listeners),
      onStopped: jest.fn(listeners),
      onError: jest.fn(listeners),
    },
  };
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
  launchCamera: jest.fn(async () => ({ didCancel: true })),
}));

// No native OCR in Jest; tests that need it mock this module with a recognizer.
jest.mock('../src/specs/NativeTextRecognizer', () => ({ __esModule: true, default: null }));

// FlashList needs layout sizes, which Jest has none of.
require('@shopify/flash-list/jestSetup');

// Node already provides crypto.getRandomValues.
jest.mock('react-native-get-random-values', () => ({}));
