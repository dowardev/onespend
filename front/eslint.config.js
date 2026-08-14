// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginOxlint from "eslint-plugin-oxlint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/android/**",
      "**/.output/**",
      "**/.nuxt/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/eslint.config.js",
      "**/vite.config.ts",
      "**/*.config.js",
      "**/*.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  eslintConfigPrettier,
  ...pluginOxlint.buildFromOxlintConfigFile(".oxlintrc.json"),
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
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
      "no-console": "off",
      "no-debugger": "off",
      "vue/no-deprecated-slot-attribute": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
  },
];