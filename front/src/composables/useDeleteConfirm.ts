import { ref } from 'vue';

export function useDeleteConfirm(params: {
  onConfirm: () => Promise<void> | void;
}) {
  const { onConfirm } = params;

  const showDeleteAlert = ref(false);

  const deleteAlertButtons = [
    {
      text: 'Cancelar',
      role: 'cancel' as const,
      handler: () => {
        showDeleteAlert.value = false;
      },
    },
    {
      text: 'Eliminar',
      cssClass: 'danger-alert-btn',
      handler: onConfirm,
    },
  ];

  function openDeleteAlert() {
    showDeleteAlert.value = true;
  }

  return {
    showDeleteAlert,
    deleteAlertButtons,
    openDeleteAlert,
  };
}
