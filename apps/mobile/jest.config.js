// ESM-only or untranspiled packages that Jest must run through Babel.
const transpile = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-svg',
  'react-native-keychain',
  '@op-engineering',
  '@mhpdev',
  'react-native-get-random-values',
  'react-native-image-picker',
  '@shopify',
  'i18next',
  'react-i18next',
  'zustand',
  '@tanstack',
].join('|');

module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest/setup-after-env.js'],
  moduleNameMapper: {
    // Test against shared TypeScript source rather than its built output.
    '^@saddahaq/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@env$': '<rootDir>/jest/env.js',
  },
  transformIgnorePatterns: [`node_modules/(?!(${transpile})/)`],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/jest/'],
};
