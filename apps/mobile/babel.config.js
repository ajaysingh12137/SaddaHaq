module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // zod v4 ships `export * as ns from` syntax that the RN preset does not transform.
    '@babel/plugin-transform-export-namespace-from',
    // Exposes apps/mobile/.env as `import { API_URL } from '@env'` at build time.
    [
      'module:react-native-dotenv',
      { moduleName: '@env', path: '.env', safe: false, allowUndefined: true },
    ],
  ],
};
