import { defineConfig } from 'eslint-define-config';

export default defineConfig({
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:import/typescript'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
    browser: true,
    es2020: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn'],
    'import/no-unresolved': 'off',
    'no-console': 'warn',
  },
});
