import { reactive, ref } from 'vue';

export interface SnapshotData {
  totalSales?: number;
  netProfit?: number;
  [key: string]: unknown;
}

export function usePeriodView(initialModal = false) {
  const modalOpen = ref<boolean>(!!initialModal);

  const snapshots = reactive<SnapshotState>({
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

  function setSnapshots(payload: { current?: SnapshotData; previous?: SnapshotData }) {
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

interface SnapshotState {
  current: SnapshotData;
  previous: SnapshotData;
}
