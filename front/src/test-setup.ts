// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: vitest global setup. Installs vue-i18n once so any
// component test that mounts a wrapped component (with `useLocale()`
// in its <script setup>) gets a working t() rather than the
// "Need to install with app.use function" runtime error.

import { createI18n } from 'vue-i18n';
import es from './locales/es.json';
import en from './locales/en.json';

// We attach the i18n instance to the test global so component tests
// that need a different locale (or want to spy on t) can grab it.
const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'es',
  fallbackLocale: 'en',
  messages: { es, en },
});

(globalThis as unknown as { __i18n: typeof i18n }).__i18n = i18n;
