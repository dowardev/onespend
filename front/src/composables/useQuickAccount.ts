import { ref } from 'vue';
import accountsController from '@/controllers/accountsController';

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
      a: { name, initialBalance },
    });

    if (newAccount && quickAccountTargetIndex.value !== null) {
      onAccountCreated({ newAccount: newAccount as { id: IDBValidKey }, targetIndex: quickAccountTargetIndex.value });
    }

    quickAccountTargetIndex.value = null;
  }

  const quickAccountInputs = [
    { name: 'accountName', type: 'text' as const, placeholder: 'Nombre de la cuenta' },
    { name: 'initialBalance', type: 'number' as const, placeholder: 'Balance inicial (opcional)', value: 0 },
  ];

  const quickAccountButtons = [
    { text: 'Cancelar', role: 'cancel' as const },
    {
      text: 'Crear',
      handler: (data: { accountName: string; initialBalance: string }) => {
        if (!data.accountName || data.accountName.trim() === '') {
          return false;
        }
        createQuickAccount({ name: data.accountName.trim(), initialBalance: Number(data.initialBalance) || 0 });
        return true;
      },
    },
  ];

  return {
    showQuickAccountAlert,
    quickAccountTargetIndex,
    quickAccountInputs,
    quickAccountButtons,
    openQuickAccountAlert,
    createQuickAccount,
  };
}
