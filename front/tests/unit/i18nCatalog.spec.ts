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
import { format } from 'date-fns';
import es from '@/locales/es.json';
import en from '@/locales/en.json';
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  translate,
  getIntlLocale,
  getCurrentLocale,
  setCurrentLocale,
  getDateFnsLocale,
} from '@/i18n';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { useQuickAccount } from '@/composables/useQuickAccount';
import { useQuickCategory } from '@/composables/useQuickCategory';
import { getFieldLabel } from '@/controllers/lookupResolver';
import { toShortDate } from '@/utils/dateHelpers';

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
      expect(getIntlLocale()).toBe('en-US');

      setCurrentLocale('es');
      expect(translate('common.cancel')).toBe('Cancelar');
      expect(getIntlLocale()).toBe('es-ES');
    } finally {
      setCurrentLocale(original);
    }
  });
});

describe('date formatting follows the active language', () => {
  it('maps the app language to the regional variant the app already uses', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('en');
      expect(getIntlLocale()).toBe('en-US');

      setCurrentLocale('es');
      expect(getIntlLocale()).toBe('es-ES');
    } finally {
      setCurrentLocale(original);
    }
  });

  const sample = new Date('2026-01-05T12:00:00');

  it('renders month names in the active language', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('es');
      expect(format(sample, 'MMMM', { locale: getDateFnsLocale() })).toBe('enero');

      setCurrentLocale('en');
      expect(format(sample, 'MMMM', { locale: getDateFnsLocale() })).toBe('January');
    } finally {
      setCurrentLocale(original);
    }
  });

  it('uses the long date pattern of the active language', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('es');
      expect(format(sample, translate('common.dateLongFormat'), { locale: getDateFnsLocale() }))
        .toBe('5 de enero de 2026');

      setCurrentLocale('en');
      expect(format(sample, translate('common.dateLongFormat'), { locale: getDateFnsLocale() }))
        .toBe('January 5, 2026');
    } finally {
      setCurrentLocale(original);
    }
  });
});

describe('entity labels', () => {
  it('covers the same entity types in the sync view and in the DLQ view', () => {
    // The conflict resolver labels entities with `sync.view.entity.*` while
    // the dead-letter queue uses `sync.dlqview.entity.*`. Both read from the
    // same taxonomy, so a new entity type must land in both catalogs — this
    // test is what keeps a missing key from leaking a raw identifier.
    const viewEntities = Object.keys(es.sync.view?.entity ?? {});
    const dlqEntities = Object.keys(es.sync.dlqview?.entity ?? {});

    expect(viewEntities.length).toBeGreaterThan(0);
    expect(dlqEntities.length).toBeGreaterThan(0);
    expect(viewEntities.sort()).toEqual(dlqEntities.sort());
  });
});

describe('dynamic translation keys', () => {
  it('resolves every weekday, month and ordinal key the components build at runtime', () => {
    // PendingRecurringModal.vue builds these keys with a template literal, so
    // a missing entry cannot be caught by the parity check between locales:
    // it would render the raw key path in the UI.
    const dynamicKeys = [
      ...[0, 1, 2, 3, 4, 5, 6].map((day) => `recurring.edit.weekday.short.${day}`),
      ...[0, 1, 2, 3, 4, 5, 6].map((day) => `recurring.edit.weekday.full.${day}`),
      ...Array.from({ length: 12 }, (_, index) => `recurring.edit.month.${index + 1}`),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((ordinal) => `budget.components.pendingrecurringmodal.ordinal.${ordinal}`),
    ];

    const lookup = (catalog: Record<string, unknown>, path: string) =>
      path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], catalog);

    const missingInEs = dynamicKeys.filter((key) => lookup(es, key) === undefined);
    const missingInEn = dynamicKeys.filter((key) => lookup(en, key) === undefined);

    expect(missingInEs).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(dynamicKeys.length).toBe(34);
  });
});

describe('static translation keys used in the source', () => {
  it('resolves every literal key in both catalogs', () => {
    // Parity between the two catalogs is not enough: a key can be missing
    // from both. This scans the source for literal translate()/t() calls and
    // requires every one of them to resolve in es.json and en.json.
    const collectSourceFiles = (dir: string, acc: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'locales' && entry.name !== 'node_modules') {
            collectSourceFiles(full, acc);
          }
        } else if (/\.(ts|vue)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
          acc.push(full);
        }
      }
      return acc;
    };

    const lookup = (catalog: unknown, path: string) =>
      path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], catalog);

    const files = collectSourceFiles(join(process.cwd(), 'src'));
    // Both quote styles: some views call t("key") with double quotes.
    const pattern = /\b(?:translate|t)\(\s*(['"])([A-Za-z0-9_.]+)\1/g;
    const keys = new Set<string>();

    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
        keys.add(match[2]);
      }
    }

    const missingInEs = [...keys].filter((key) => lookup(es, key) === undefined).sort();
    const missingInEn = [...keys].filter((key) => lookup(en, key) === undefined).sort();

    expect(missingInEs).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(keys.size).toBeGreaterThan(500);
  });
  it('renders the full year in short dates', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('es');
      expect(toShortDate({ isoDate: '2026-01-05T12:00:00' })).toBe('05/01/2026');

      setCurrentLocale('en');
      expect(toShortDate({ isoDate: '2026-01-05T12:00:00' })).toBe('01/05/2026');
    } finally {
      setCurrentLocale(original);
    }
  });
});

describe('conflict field labels', () => {
  it('translates a known field and degrades an unknown one to its name', () => {
    const original = getCurrentLocale();
    try {
      setCurrentLocale('es');
      expect(getFieldLabel('supplier_name')).toBe('Proveedor');
      expect(getFieldLabel('unknown_field')).toBe('Unknown field');

      setCurrentLocale('en');
      expect(getFieldLabel('supplier_name')).toBe('Supplier');
      expect(getFieldLabel('unknown_field')).toBe('Unknown field');
    } finally {
      setCurrentLocale(original);
    }
  });
});

describe('translated alert labels follow the active language', () => {
  it('rebuilds the delete confirmation buttons when the locale changes', () => {
    const original = getCurrentLocale();
    try {
      const confirm = useDeleteConfirm({ onConfirm: () => {} });

      setCurrentLocale('es');
      expect(confirm.deleteAlertButtons.value[0].text).toBe('Cancelar');

      setCurrentLocale('en');
      expect(confirm.deleteAlertButtons.value[0].text).toBe('Cancel');
    } finally {
      setCurrentLocale(original);
    }
  });

  it('rebuilds the quick account and quick category prompts when the locale changes', () => {
    const original = getCurrentLocale();
    try {
      const account = useQuickAccount({ onAccountCreated: () => {} });
      const category = useQuickCategory({ onCategoryCreated: () => {} });

      setCurrentLocale('es');
      expect(account.quickAccountButtons.value[0].text).toBe('Cancelar');
      expect(category.quickCategoryButtons.value[0].text).toBe('Cancelar');

      setCurrentLocale('en');
      expect(account.quickAccountButtons.value[0].text).toBe('Cancel');
      expect(category.quickCategoryButtons.value[0].text).toBe('Cancel');
    } finally {
      setCurrentLocale(original);
    }
  });
});
