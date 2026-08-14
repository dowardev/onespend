// SPDX-FileCopyrightText: 2026 DowarDev
//
// SPDX-License-Identifier: AGPL-3.0-only

import { reactive, ref } from 'vue';

export function usePeriodView(initialModal = false) {
  const modalOpen = ref<boolean>(!!initialModal);

  const snapshots = reactive<{ current: any; previous: any }>({
    current: { totalSales: 0, netProfit: 0 },
    previous: { totalSales: 0, netProfit: 0 },
  });

  function openModal() {
    modalOpen.value = true;
  }

  function closeModal() {
    modalOpen.value = false;
  }

  function toggleModal() {
    modalOpen.value = !modalOpen.value;
  }

  function setSnapshots(payload: { current?: any; previous?: any }) {
    if (typeof payload.current !== 'undefined')
      snapshots.current = payload.current;
    if (typeof payload.previous !== 'undefined')
      snapshots.previous = payload.previous;
  }

  return {
    modalOpen,
    openModal,
    closeModal,
    toggleModal,
    snapshots,
    setSnapshots,
  } as const;
}
