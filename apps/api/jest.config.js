/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+[.]ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  setupFiles: ['<rootDir>/src/__tests__/helpers/env.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // The first run downloads a MongoDB binary for mongodb-memory-server.
  testTimeout: 60_000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/__tests__/**',
    '!src/server.ts',
    '!src/seed/run.ts',
  ],
  coverageReporters: ['text-summary'],
};
