// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// LBDS-289: vue-i18n is the single source of truth for app strings.
// `legacy: false` switches to the Composition API style (`useI18n` in
// setup), `globalInjection: true` keeps `$t` available in templates for
// the components we have not yet migrated, and the fallback to `en`
// satisfies the F-Droid reviewer's "non-es locales should fall back to
// English" request.

import { createI18n } from 'vue-i18n';
import { es as esDateFnsLocale, enUS as enUSDateFnsLocale } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import es from './locales/es.json';
import en from './locales/en.json';

export type AppLocale = 'es' | 'en';

export const SUPPORTED_LOCALES: ReadonlyArray<AppLocale> = ['es', 'en'];

/**
 * Detects the user's preferred locale from the browser/device language.
 * F-Droid reviewer (`visheh10`) asked for English as the fallback for
 * any non-es locale. We follow that — Spanish native speakers keep
 * Spanish, everyone else gets English. The user can still override from
 * the language selector in MainMenu, and that override is persisted in
 * configDb (`languageOverride`).
 */
export function detectSystemLocale(): AppLocale {
  if (typeof navigator === 'undefined') return 'es';
  const raw = navigator.language
    || (navigator as { userLanguage?: string }).userLanguage
    || 'es';
  const lower = raw.toLowerCase();
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}

function isAppLocale(value: unknown): value is AppLocale {
  return value === 'es' || value === 'en';
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'es',
  fallbackLocale: 'en',
  messages: { es, en },
});

/**
 * Helper for code paths that need to know the currently active locale
 * without going through a component. Used by `useLocale` to read the
 * initial value before any component has mounted.
 */
export function getCurrentLocale(): AppLocale {
  const value = i18n.global.locale.value;
  return isAppLocale(value) ? value : 'es';
}

export function setCurrentLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;
}

/**
 * Returns the BCP-47 tag to use for `Intl` formatting (dates, currency).
 * It follows the active app locale so an English user sees English date
 * and currency formats.
 */
export function getIntlLocale(): string {
  // Same regional variants the app already uses for the date picker
  // (DATETIME_LOCALE_BY_APP_LOCALE in DatePickerPopover.vue): 'es-ES' and
  // 'en-US'. English must stay month-first, as it was before the i18n pass.
  return getCurrentLocale() === 'en' ? 'en-US' : 'es-ES';
}

/**
 * Returns the `date-fns` locale matching the active app language, so month
 * and weekday names ("enero"/"January") follow the app instead of being
 * pinned to Spanish.
 */
export function getDateFnsLocale(): Locale {
  return getCurrentLocale() === 'en' ? enUSDateFnsLocale : esDateFnsLocale;
}

/**
 * Translates a message outside of a component setup (services, plain
 * controllers, DB helpers). Those code paths cannot call `useLocale()`
 * because `useI18n()` needs an active component instance, so they use
 * the global composer instead. The locale is read at call time, so the
 * translation always follows the active language.
 */
export function translate(
  path: string,
  params?: Record<string, unknown>,
): string {
  return params ? i18n.global.t(path, params) : i18n.global.t(path);
}