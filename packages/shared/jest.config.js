/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/index.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: { branches: 95, functions: 100, lines: 98, statements: 98 },
    // The product spec requires full branch coverage on the eligibility rules.
    './src/eligibility.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './src/fy.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
