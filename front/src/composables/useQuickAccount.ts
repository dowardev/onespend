// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { ref, computed } from 'vue';
import accountsController from '@/controllers/accountsController';
import { translate } from '@/i18n';

export function useQuickAccount(params: {
  onAccountCreated: (params: { newAccount: { id: IDBValidKey }; targetIndex: number }) => void;
}) {
  const { onAccountCreated } = params;

  const showQuickAccountAlert = ref(false);
  const quickAccountTargetIndex = ref<number | null>(null);

  function openQuickAccountAlert(params: { targetIndex?: number }) {
    const { targetIndex } = params;
    quickAccountTargetIndex.value = targetIndex ?? null;
    showQuickAccountAlert.value = true;
  }

  async function createQuickAccount(params: { name: string; initialBalance: number }) {
    const { name, initialBalance } = params;
    const newAccount = await accountsController.addAccount({
      account: { name, initialBalance },
    });

    if (newAccount && quickAccountTargetIndex.value !== null) {
      onAccountCreated({ newAccount: newAccount as { id: IDBValidKey }, targetIndex: quickAccountTargetIndex.value });
    }

    quickAccountTargetIndex.value = null;
  }

  const quickAccountInputs = computed(() => [
    { name: 'accountName', type: 'text' as const, placeholder: translate('components.quickAccount.namePlaceholder') },
    { name: 'initialBalance', type: 'number' as const, placeholder: translate('components.quickAccount.initialBalancePlaceholder'), value: 0 },
  ]);

  const quickAccountButtons = computed(() => [
    { text: translate('common.cancel'), role: 'cancel' as const },
    {
      text: translate('common.create'),
      handler: (data: { accountName: string; initialBalance: string }) => {
        if (!data.accountName || data.accountName.trim() === '') {
          return false;
        }
        createQuickAccount({ name: data.accountName.trim(), initialBalance: Math.max(0, Number(data.initialBalance) || 0) });
        return true;
      },
    },
  ]);

  return {
    showQuickAccountAlert,
    quickAccountTargetIndex,
    quickAccountInputs,
    quickAccountButtons,
    openQuickAccountAlert,
    createQuickAccount,
  };
}
