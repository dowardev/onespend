import { ref, reactive, nextTick, computed } from 'vue';
import { format } from 'date-fns';

export function useDatePicker(params?: {
  initialDate?: string | null;
}) {
  const initialDate = params?.initialDate ?? null;

  const dateISO = ref<string | null>(initialDate);
  const tempPickerDateISO = ref<string | null>(null);
  const showPicker = ref(true);
  const popoverState = reactive({ open: false, event: null as Event | null });

  const canApply = computed(() => {
    const short = tempPickerDateISO.value?.slice(0, 10);
    return short?.length === 10;
  });

  async function openPopover(params: { e: Event }) {
    const { e } = params;
    if (!dateISO.value) {
      dateISO.value = format(new Date(), 'yyyy-MM-dd') + 'T00:00:00';
    }
    tempPickerDateISO.value = dateISO.value;

    showPicker.value = false;
    await nextTick();
    showPicker.value = true;

    popoverState.event = e;
    popoverState.open = true;
  }

  function applyDate() {
    const finalDate = tempPickerDateISO.value?.slice(0, 10);
    if (!finalDate) return;
    dateISO.value = tempPickerDateISO.value;
    popoverState.open = false;
    popoverState.event = null;
    return finalDate;
  }

  function closePopover() {
    popoverState.open = false;
    popoverState.event = null;
  }

  function setDate(params: { date: string }) {
    const { date } = params;
    dateISO.value = date.includes('T') ? date : `${date}T00:00:00`;
  }

  return {
    dateISO,
    tempPickerDateISO,
    showPicker,
    popoverState,
    canApply,
    openPopover,
    applyDate,
    closePopover,
    setDate,
  };
}
