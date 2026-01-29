import js from '@eslint/js';
import pluginTypescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginImport from 'eslint-plugin-import';
import sortExportsPlugin from 'eslint-plugin-sort-exports';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        URLSearchParams: 'readonly',
        Amplience: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': pluginTypescriptEslint,
      unicorn: pluginUnicorn,
      import: pluginImport,
      'sort-exports': sortExportsPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
      'import/internal-regex': '^~',
    },
    rules: {
      ...pluginTypescriptEslint.configs.recommended.rules,
      'linebreak-style': ['error', 'unix'],
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
        },
      ],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-undef': 'off',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
      'import/no-unresolved': 'error' /** Ensure no unresolved imports */,
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'inquirer',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '~/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '**/*.{css,scss,sass,less}',
              patternOptions: { matchBase: true },
              group: 'index',
              position: 'after',
            },
            {
              pattern: '*.module.{css,scss,sass,less}',
              patternOptions: { matchBase: true },
              group: 'index',
              position: 'after',
            },
          ],

          pathGroupsExcludedImportTypes: ['builtin', 'object'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              from: 'src/commands',
              target: 'src/prompts',
            },
            {
              from: 'src/commands',
              target: 'src/services',
            },
            {
              from: 'src/services',
              target: 'src/utils',
            },
            {
              from: 'src/services',
              target: 'src/prompts',
            },
            {
              from: 'src/prompts',
              target: 'src/utils',
            },
          ],
        },
      ],

      'no-case-declarations': 'error',
      'no-sparse-arrays': 'off',
      'padding-line-between-statements': 'off',
      '@/padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: 'directive', next: 'import' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],
      'sort-exports/sort-exports': [
        'warn',
        {
          ignoreCase: true,
        },
      ],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'reports/**'],
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
];
