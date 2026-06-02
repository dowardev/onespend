<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" @click="cancelApply">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Aplicar template</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="confirmApply">
            <ion-icon :icon="checkmarkOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="applyTargetTemplate">
        <ion-card class="shadow1">
          <ion-card-header>
            <ion-card-title>{{ applyTargetTemplate.name }}</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <ion-item class="transparent" button @click="openDatePopover({ ev: $event })">
              <ion-label>Fecha</ion-label>
              <ion-label slot="end">{{ formattedApplyDate }}</ion-label>
            </ion-item>

            <ion-list class="transparent">
              <ion-list-header>
                <ion-label>Proveedores</ion-label>
              </ion-list-header>

              <div class="content">
                <!-- Si el template tiene IDs -->
                <template
                  v-if="applyTargetTemplate.suppliers && applyTargetTemplate.suppliers.length"
                >
                  <ion-item
                    v-for="(id, idx) in applyTargetTemplate.suppliers"
                    :key="String(id) + '_' + idx"
                    class="transparent"
                    lines="full"
                  >
                    <ion-label>
                      {{ supplierDisplayName({ id }) }}
                    </ion-label>

                    <template v-if="!supplierExists({ id })">
                      <ion-chip slot="end" color="danger"> Eliminado </ion-chip>

                      <ion-button
                        slot="end"
                        color="primary"
                        fill="clear"
                        @click="removeDeletedSupplier({ id })"
                      >
                        <ion-icon :icon="closeOutline"> </ion-icon>
                      </ion-button>
                    </template>
                  </ion-item>
                </template>

                <!-- Si el template solo tiene description -> mostrar parsed names -->
                <template v-else>
                  <ion-item
                    v-for="(name, idx) in parseProvidersFromDescription(
                      applyTargetTemplate?.description,
                    )"
                    :key="idx"
                    lines="none"
                  >
                    <ion-label>{{ name }}</ion-label>
                  </ion-item>
                </template>
              </div>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- popovers -->
      <ion-popover
        :is-open="datePopoverOpen"
        :event="datePopoverEvent"
        keep-contents-mounted
        @did-dismiss="closeDatePopover"
      >
        <ion-content>
          <ion-datetime
            :value="selectedDate"
            :presentation="'date'"
            @ion-change="onDateChange({ ev: $event })"
          ></ion-datetime>
        </ion-content>
      </ion-popover>
      <!-- end popovers -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonChip,
  IonPopover,
  IonDatetime,
} from '@ionic/vue';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { defineProps, defineEmits, ref, computed } from 'vue';
import { format } from 'date-fns';
import { parseLocalDate } from '@/utils/date';
import { parseProvidersFromDescription } from '@/controllers/templateService';

// main
interface ApplyTargetTemplate {
  id?: string | number | null;
  name?: string;
  description?: string;
  suppliers?: IDBValidKey[];
  suppliersSnapshot?: Array<{ id: IDBValidKey; name?: string }>;
}

const props = defineProps<{
  applyTargetTemplate: ApplyTargetTemplate | null;
  suppliers: Supplier[];
  applySelectedDate: string;
}>();
const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'remove-deleted-supplier', id: IDBValidKey): void;
  (e: 'update:applySelectedDate', val: string): void;
}>();
// end main

// vars
const datePopoverOpen = ref(false);
const datePopoverEvent = ref<Event | null>(null);
let initialDate = new Date();
try {
  if (props.applySelectedDate) {
    const parsed = parseLocalDate({ d: String(props.applySelectedDate) });
    if (!isNaN(parsed.getTime())) initialDate = parsed;
  }
} catch (_e) {
  /* noop */
}
const selectedDate = ref<string>(format(initialDate, 'yyyy-MM-dd'));
// end vars

// computed
const formattedApplyDate = computed(() => {
  try {
    const d = selectedDate.value;
    if (!d) return '-';
    const parsed = parseLocalDate({ d: String(d) });
    if (isNaN(parsed.getTime())) return String(d);
    return format(parsed, "d 'de' MMMM 'de' yyyy");
  } catch (_e) {
    return selectedDate.value || '-';
  }
});
// end computed

// functions
function openDatePopover(params: { ev: Event }) {
  const { ev } = params;
  datePopoverEvent.value = ev;
  datePopoverOpen.value = true;
}

function closeDatePopover() {
  datePopoverOpen.value = false;
  datePopoverEvent.value = null;
}

function onDateChange(ev: CustomEvent) {
  const val = (ev.detail && ev.detail.value) || (ev.target as HTMLInputElement)?.value || '';
  if (!val) return;
  selectedDate.value = val;
  // Emit update for v-model style binding
  emit('update:applySelectedDate', val);
}

function supplierExists(params: { id: IDBValidKey }): boolean {
  const { id } = params;
  return !!(props.suppliers || []).some((s: Supplier) => s && s.id === id);
}

function supplierDisplayName(params: { id: IDBValidKey }): string {
  const { id } = params;
  // Prefer current supplier name if it exists
  const s = (props.suppliers || []).find((x: Supplier) => x.id === id);
  if (s && s.name) return s.name;

  const snapshotList = props.applyTargetTemplate?.suppliersSnapshot || [];
  const snap = (snapshotList as { id: IDBValidKey; name?: string }[]).find((ss) => ss.id === id);
  if (snap && snap.name) return snap.name || String(id);

  return String(id);
}

function removeDeletedSupplier(params: { id: IDBValidKey }) {
  const { id } = params;
  // Emit kebab-case event so template listeners using kebab-case match.
  emit('remove-deleted-supplier', id);
}

function confirmApply() {
  emit('confirm');
}

function cancelApply() {
  emit('cancel');
}
</script>
