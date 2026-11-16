// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

// Quick global category creation (LBDS-210 §1): mirrors `useQuickAccount` so the
// entry-form picker can create a category inline by NAME ONLY. Categories are a
// global concept (no section here); the Income Statement section→category mapping
// is configured separately in the Performance config panel.

import { ref } from 'vue';
import { entryCategoriesDb } from '@/db/controllers/entryCategoriesDb';
import { translate } from '@/i18n';
import type { EntryCategoryRow } from '@/db/types';

export function useQuickCategory(params: {
  onCategoryCreated: (params: { newCategory: EntryCategoryRow }) => void;
}) {
  const { onCategoryCreated } = params;

  const showQuickCategoryAlert = ref(false);

  function openQuickCategoryAlert() {
    showQuickCategoryAlert.value = true;
  }

  async function createQuickCategory(params: { name: string }): Promise<boolean> {
    const { name } = params;
    if (!name.trim()) return false;

    const existing = await entryCategoriesDb.getAll();
    const exists = existing.some(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (exists) return false; // duplicate-name guard (global)

    const newCategory = await entryCategoriesDb.add({
      name: name.trim(),
    });
    if (newCategory) {
      onCategoryCreated({ newCategory });
    }
    return true;
  }

  const quickCategoryInputs = [
    { name: 'categoryName', type: 'text' as const, placeholder: translate('components.quickCategory.namePlaceholder') },
  ];

  const quickCategoryButtons = [
    { text: translate('common.cancel'), role: 'cancel' as const },
    {
      text: translate('common.create'),
      handler: async (data: { categoryName: string }) => {
        if (!data.categoryName || data.categoryName.trim() === '') {
          return false;
        }
        return await createQuickCategory({ name: data.categoryName.trim() });
      },
    },
  ];

  return {
    showQuickCategoryAlert,
    quickCategoryInputs,
    quickCategoryButtons,
    openQuickCategoryAlert,
    createQuickCategory,
  };
}