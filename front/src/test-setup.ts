// SPDX-FileCopyrightText: 2026 DowarDev
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: vitest global setup. Installs vue-i18n once so any
// component test that mounts a wrapped component (with `useLocale()`
// in its <script setup>) gets a working t() rather than the
// "Need to install with app.use function" runtime error.
//
// GitLab #23: also installs the jsdom storage globals. Node 26 (the LTS)
// exposes an experimental global `localStorage` that stays `undefined`
// without `--localstorage-file`, and vitest only copies the jsdom globals
// it knows about, so `localStorage` in a test would be `undefined` and
// every spec that touches it would fail. vitest exposes the jsdom instance
// as `globalThis.jsdom`, so the browser implementations are installed here
// explicitly and the specs keep exercising real browser storage.

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

// GitLab #23: the jsdom storage globals. `window.localStorage` /
// `window.sessionStorage` throw on an opaque origin, and vitest's jsdom
// environment uses `http://localhost:3000` by default, so they are safe to
// read here. The globals are installed as own properties of `globalThis`
// because Node's experimental ones are accessors that shadow jsdom's.
const jsdomWindow = (globalThis as unknown as { jsdom?: { window?: Window } }).jsdom?.window;

if (jsdomWindow) {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    const storage = jsdomWindow[storageName];

    if (storage) {
      Object.defineProperty(globalThis, storageName, {
        value: storage,
        configurable: true,
        writable: true,
      });
    }
  }
}
