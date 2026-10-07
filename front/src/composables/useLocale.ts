// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: language override persistence. The initial locale is
// resolved in main.ts (before mount) by `resolveInitialLocale` so the
// first render already uses the right language. The selector in
// MainMenu calls `setOverride` here to persist the user's choice; the
// active locale is read through `useI18n` so vue-i18n's reactivity
// covers both the template and the persistence side.

import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { configDb } from '@/db/controllers/configDb';
import {
  detectSystemLocale,
  setCurrentLocale,
  type AppLocale,
} from '@/i18n';

const LANGUAGE_OVERRIDE_KEY = 'languageOverride';

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'es' || value === 'en';
}

/**
 * Returns the user's stored override, or `null` when none has been set
 * (i.e. the app should follow the system locale).
 */
export async function loadLocaleOverride(): Promise<AppLocale | null> {
  const stored = await configDb.get({ key: LANGUAGE_OVERRIDE_KEY });
  return isAppLocale(stored) ? stored : null;
}

/**
 * Persists the user's locale choice. `null` clears the override, so
 * the app reverts to the system locale on the next boot.
 */
export async function setLocaleOverride(params: { locale: AppLocale | null }): Promise<void> {
  const { locale } = params;
  if (locale === null) {
    await configDb.delete({ key: LANGUAGE_OVERRIDE_KEY });
    return;
  }
  await configDb.set({ key: LANGUAGE_OVERRIDE_KEY, value: locale });
}

/**
 * Resolves the locale to use on cold start. Priority: persisted
 * override > system locale (with English as the universal fallback per
 * the F-Droid reviewer's request).
 */
export async function resolveInitialLocale(): Promise<AppLocale> {
  const override = await loadLocaleOverride();
  return override ?? detectSystemLocale();
}

export function useLocale(): {
  t: ReturnType<typeof useI18n>['t'];
  locale: ComputedRef<AppLocale>;
  setLocale: (locale: AppLocale) => void;
  setOverride: (locale: AppLocale | null) => Promise<void>;
  loadOverride: () => Promise<AppLocale | null>;
  clearOverride: () => Promise<void>;
  hasOverride: () => Promise<boolean>;
} {
  // LBDS-289: tests mount components without installing the
  // vue-i18n plugin (e.g. the unit tests for InicioViewComponent and
  // CategoryPickerModal). In that env, `useI18n()` throws
  // "Need to install with app.use function". The test setup attaches a
  // global i18n instance to `globalThis.__i18n`; we fall back to it
  // when the plugin is not installed so the production path stays the
  // same (call `useI18n()` first, only fall back if it throws).
  let t: ReturnType<typeof useI18n>['t'];
  let i18nLocale: ReturnType<typeof useI18n>['locale'];
  try {
    const i18n = useI18n();
    t = i18n.t;
    i18nLocale = i18n.locale;
  } catch {
    const fallback = (globalThis as { __i18n?: { global: { t: ReturnType<typeof useI18n>['t']; locale: ReturnType<typeof useI18n>['locale'] } } }).__i18n;
    if (!fallback) throw new Error('useLocale requires vue-i18n to be installed (or test-setup.ts to attach __i18n)');
    t = fallback.global.t;
    i18nLocale = fallback.global.locale;
  }

  const locale: ComputedRef<AppLocale> = computed<AppLocale>(() => {
    const value = i18nLocale.value;
    return isAppLocale(value) ? value : 'es';
  });

  function setLocale(next: AppLocale): void {
    setCurrentLocale(next);
  }

  async function setOverride(next: AppLocale | null): Promise<void> {
    await setLocaleOverride({ locale: next });
  }

  async function clearOverride(): Promise<void> {
    await setLocaleOverride({ locale: null });
  }

  async function hasOverride(): Promise<boolean> {
    return (await loadLocaleOverride()) !== null;
  }

  return {
    t,
    locale,
    setLocale,
    setOverride,
    loadOverride: loadLocaleOverride,
    clearOverride,
    hasOverride,
  };
}