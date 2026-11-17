// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, computed } from 'vue';
import { translate } from '@/i18n';

export function useDeleteConfirm(params: {
  onConfirm: () => Promise<void> | void;
}) {
  const { onConfirm } = params;

  const showDeleteAlert = ref(false);

  // `computed` (not a plain array): the labels are translated, so they must
  // be rebuilt when the active language changes, not frozen at setup time.
  const deleteAlertButtons = computed(() => [
    {
      text: translate('common.cancel'),
      role: 'cancel' as const,
      handler: () => {
        showDeleteAlert.value = false;
      },
    },
    {
      text: translate('common.delete'),
      cssClass: 'danger-alert-btn',
      handler: onConfirm,
    },
  ]);

  function openDeleteAlert() {
    showDeleteAlert.value = true;
  }

  return {
    showDeleteAlert,
    deleteAlertButtons,
    openDeleteAlert,
  };
}
