/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: [
    'dist',
    'doc', // salida generada por JSDoc, no es codigo fuente
    'node_modules',
    // @typescript-eslint/parser@7.18.0 crashes ("Cannot read properties of
    // undefined (reading 'members')") parsing ANY `export enum` regardless
    // of eslint 8.56.x/8.57.x patch -- confirmed with a minimal isolated
    // repro (bare 2-line enum, no project config). Not fixable without a
    // major @typescript-eslint version bump. Remove this line once that
    // upgrade happens and re-verify with `npx eslint src/types/index.ts`.
    'src/types/index.ts',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
    ]
  }
};
