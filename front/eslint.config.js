import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Ignorar directorios y archivos
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.output/**',
      '**/.nuxt/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.prettierrc.cjs',
      '**/eslint.config.js',
      '**/vite.config.ts',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
  },
  // Configuración base de JavaScript
  js.configs.recommended,
  // Configuraciones recomendadas de TypeScript
  ...tseslint.configs.recommended,
  // Configuraciones recomendadas de Vue
  ...pluginVue.configs['flat/recommended'],
  // Configuración de Prettier
  prettierConfig,
  // Configuración personalizada
  {
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        node: true,
        browser: true,
        es2020: true,
        process: true,
        module: true,
        require: true,
        console: true,
        IDBValidKey: true,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'no-console': 'off',
      'no-debugger': 'off',
      'vue/no-deprecated-slot-attribute': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'prettier/prettier': 'warn',
    },
  },
  // Configuración específica para archivos Vue
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  },
];

