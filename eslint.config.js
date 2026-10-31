// ESLint flat config (ESLint 9+), CommonJS format.
// Each app can add its own overrides on top of these shared rules.

const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Allow explicit `any` in a few cases.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Non-null assertions sometimes unavoidable with Drizzle return types.
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Unused variables are errors so CI catches them early.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Ignore build outputs and generated files.
    ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**'],
  },
];
