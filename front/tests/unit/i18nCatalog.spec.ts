// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Regression guard for the i18n extraction of the hardcoded Spanish UI text.
//
// Two things are pinned here:
//
// 1. `translate()` must work from plain TypeScript modules (services,
//    controllers, utils) WITHOUT a mounted Vue app. `i18n` is a module-level
//    singleton created by `createI18n()`, so `i18n.global.t` is available as
//    soon as the module is imported — the app does not need to be mounted
//    first. This is the guarantee the non-component call sites rely on.
// 2. `es.json` and `en.json` must keep the same key set. A key present in
//    only one of them renders as the raw key path in the UI (or falls back
//    to the other locale), which is how Spanish text used to leak into the
//    English build.

import { describe, it, expect } from 'vitest';
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import { translate, getIntlLocale, getCurrentLocale, setCurrentLocale } from '@/i18n';

type MessageTree = { [key: string]: string | MessageTree };

function flattenKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
  );
}

describe('i18n message catalogs', () => {
  it('keeps es.json and en.json with the same key set', () => {
    const esKeys = new Set(flattenKeys(es as MessageTree));
    const enKeys = new Set(flattenKeys(en as MessageTree));

    const missingInEn = [...esKeys].filter((key) => !enKeys.has(key));
    const missingInEs = [...enKeys].filter((key) => !esKeys.has(key));

    expect(missingInEn).toEqual([]);
    expect(missingInEs).toEqual([]);
    expect(esKeys.size).toBe(enKeys.size);
  });

  it('leaves no Spanish text behind in the English catalog', () => {
    const offenders = flattenKeys(en as MessageTree).filter((key) => {
      const value = (en as MessageTree)[key];
      return typeof value === 'string' && /[áéíóúñ¿¡]/i.test(value);
    });

    // `settings.language.es` is the Spanish endonym on purpose.
    expect(offenders).toEqual([]);
  });
});

describe('translate() outside a component setup', () => {
  it('resolves a message without a mounted Vue app', () => {
    // No `createApp`, no `app.use(i18n)`: the module-level composer is enough.
    expect(translate('common.cancel')).toBe('Cancelar');
    expect(translate('common.cancel')).toBe('Cancelar');
  });

  it('interpolates named parameters', () => {
    expect(translate('lookupResolver.list', { count: 3 })).toBe('Lista (3)');
  });

  it('follows the active locale', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('en');
      expect(translate('common.cancel')).toBe('Cancel');
      expect(getIntlLocale()).toBe('en-GB');

      setCurrentLocale('es');
      expect(translate('common.cancel')).toBe('Cancelar');
      expect(getIntlLocale()).toBe('es-ES');
    } finally {
      setCurrentLocale(original);
    }
  });
});
