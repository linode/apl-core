// eslint.config.js
import { fixupPluginRules } from '@eslint/compat'
import pluginTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'
import pluginImport from 'eslint-plugin-import'
import pluginUnused from 'eslint-plugin-unused-imports'
import pluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    '.history/',
    '.vscode/',
    'build/',
    'dist/',
    'coverage/',
    'vendors/client/',
  ]),
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: parserTs,
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
      },
      globals: {
        ...globals.es6,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': fixupPluginRules(pluginTs),
      import: fixupPluginRules(pluginImport),
      'unused-imports': fixupPluginRules(pluginUnused),
      prettier: fixupPluginRules(pluginPrettier),
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts'],
          paths: ['src'],
        },
        typescript: {},
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/member-delimiter-style': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': [
        'error',
        {
          allow: ['deps', 'secrets', 'values'],
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^(_|next)',
        },
      ],
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',

      // General rules
      'func-names': 'off',
      'import/no-commonjs': 'error',
      'import/no-extraneous-dependencies': 'off',
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'eol-last': ['error', 'always'],
      'func-style': ['off', 'expression'],
      'no-console': 'off',
      'no-debugger': 'error',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['memo'],
        },
      ],
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      'no-underscore-dangle': 'off',
      'object-shorthand': 'error',
      'prefer-destructuring': 'warn',
      'prefer-template': 'error',

      // Plugin rules
      'prettier/prettier': 'error',
    },
  },
  // Test files specific configuration
  {
    files: ['**/*.test.ts', '**/stubs/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
