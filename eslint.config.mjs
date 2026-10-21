// @ts-check
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const reactNativeConfig = require('@react-native/eslint-config/flat');

const MOBILE = 'apps/mobile';

/** Drop Flow rules: we don't use Flow, and eslint-plugin-ft-flow 2.x crashes on ESLint 9. */
function withoutFlowRules(rules) {
  return rules
    ? Object.fromEntries(Object.entries(rules).filter(([name]) => !name.startsWith('ft-flow/')))
    : rules;
}

/** Scope every entry of the React Native flat config to the mobile app. */
const mobileConfig = reactNativeConfig.map(entry => ({
  ...entry,
  rules: withoutFlowRules(entry.rules),
  files: (entry.files ?? ['**/*.{js,jsx,ts,tsx}']).map(pattern => `${MOBILE}/${pattern}`),
}));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      `${MOBILE}/android/**`,
      `${MOBILE}/ios/**`,
      `${MOBILE}/vendor/**`,
    ],
  },
  {
    files: ['packages/**/*.{ts,js}', 'apps/api/**/*.{ts,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.config.js', '**/*.config.mjs', '**/.prettierrc.js', '**/babel.config.js'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  ...mobileConfig,
  {
    // Babel-parsed JS in the app must find the app's own Babel config when linting from the root.
    files: [`${MOBILE}/**/*.{js,jsx}`],
    languageOptions: {
      parserOptions: {
        babelOptions: {
          configFile: fileURLToPath(new URL(`./${MOBILE}/babel.config.js`, import.meta.url)),
        },
      },
    },
  },
  {
    files: [`${MOBILE}/**/*.{ts,tsx}`],
    rules: {
      // Styles are computed from runtime theme tokens (light/dark, language), so inline is normal.
      'react-native/no-inline-styles': 'off',
      // `void promise` marks an intentional fire-and-forget call.
      'no-void': 'off',
    },
  },
  prettierConfig,
);
