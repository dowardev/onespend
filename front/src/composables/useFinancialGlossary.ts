// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { useLocale } from '@/composables/useLocale'

export interface GlossaryEntry {
  term: string
  definition: string
  formula?: string
}

// Slugs the rest of the app uses to look up glossary entries. Keep this
// list in sync with the `statistics.performance.glossary.*` keys in
// src/locales/{es,en}.json. The lookup `useGlossary` translates the
// slug into a fully-localized entry via vue-i18n.
export type GlossaryKey =
  | 'grossProfit'
  | 'operatingSavings'
  | 'netResult'
  | 'incomes'
  | 'costOfLife'
  | 'discretionaryExpenses'
  | 'financialExpenses'
  | 'salary'
  | 'investments'
  | 'otherIncome'
  | 'housing'
  | 'food'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'interestAndFees'
  | 'other'

/**
 * Look up a glossary entry by its slug. Returns a fully-translated
 * entry, or undefined if the slug is unknown. The Spanish display
 * name is kept as the locale fallback so callers that have not been
 * migrated yet still get something reasonable.
 */
export function useGlossary(termKey: GlossaryKey): GlossaryEntry | undefined {
  const { t } = useLocale()
  const base = `statistics.performance.glossary.${termKey}`
  // The locale files declare {term, definition, formula?} per slug.
  // vue-i18n returns the key itself when the path is unknown, so we
  // guard with a non-empty value check.
  const term = t(`${base}.term`)
  if (!term || term === `${base}.term`) return undefined
  const definition = t(`${base}.definition`)
  const formula = t(`${base}.formula`)
  return {
    term,
    definition,
    formula: formula && formula !== `${base}.formula` ? formula : undefined,
  }
}
