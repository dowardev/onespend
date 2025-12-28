<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="6">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button
              :disabled="props.controlsDisabled"
              @click="
                localPopovers.addEntryType.event = $event;
                localPopovers.addEntryType.open = true;
              "
            >
              <ion-icon :icon="addOutline"></ion-icon>
            </ion-button>
          </ion-list-header>

          <div
            class="list-content"
            style="flex: 1 1 auto; overflow-y: auto; min-height: 0"
          >
            <template v-if="props.entries && props.entries.length > 0">
              <template
                v-for="(block, bIdx) in renderedEntries"
                :key="blockKey(block, bIdx)"
              >
                <ion-accordion-group v-if="block.type === 'group'">
                  <ion-accordion>
                    <ion-item
                      slot="header"
                      lines="none"
                      class="provider-accordion-header"
                    >
                      <ion-icon :icon="personOutline" slot="start"></ion-icon>

                      <ion-label>
                        <div class="provider-header">
                          <span class="provider-name-text">{{
                            block.providerName || 'Proveedor'
                          }}</span>
                          -
                          <span class="provider-total">{{
                            formatCurrencyLocal({ v: block.total || 0 })
                          }}</span>
                        </div>
                      </ion-label>

                      <ion-button
                        fill="clear"
                        size="small"
                        title="Eliminar gastos del proveedor"
                        color="danger"
                        @click.prevent.stop="
                          confirmDeleteGroup(block.groupId, block.providerName)
                        "
                      >
                        <ion-icon :icon="trashOutline"></ion-icon>
                      </ion-button>
                    </ion-item>

                    <div slot="content">
                      <ion-list class="provider-group transparent">
                        <template v-for="inc in block.items" :key="inc.id">
                          <ion-item lines="full" class="income-item">
                            <ion-icon
                              slot="start"
                              :icon="
                                inc.entryType === 'egreso'
                                  ? arrowBackOutline
                                  : arrowForwardOutline
                              "
                              :color="
                                inc.entryType === 'egreso'
                                  ? 'danger'
                                  : 'success'
                              "
                            ></ion-icon>

                            <ion-select
                              slot="start"
                              :value="inc.paymentType"
                              aria-label="Tipo de pago"
                              interface="popover"
                              @ion-change="
                                e =>
                                  emit('update-ingreso', {
                                    id: inc.id,
                                    changes: { paymentType: e?.detail?.value },
                                  })
                              "
                            >
                              <ion-select-option value="cash"
                                >Efectivo</ion-select-option
                              >
                              <ion-select-option value="digital"
                                >Digital</ion-select-option
                              >
                            </ion-select>

                            <ion-input
                              :value="inc.amount"
                              placeholder="Cantidad"
                              type="number"
                              class="num-input"
                              @ion-input="
                                e =>
                                  emit('update-ingreso', {
                                    id: inc.id,
                                    changes: {
                                      amount: Number(e?.detail?.value) || 0,
                                    },
                                  })
                              "
                            ></ion-input>

                            <ion-note slot="end">{{
                              formatTimeLocal(inc.createdAt)
                            }}</ion-note>

                            <ion-button
                              :id="`options-btn-${inc.id}`"
                              slot="end"
                              class="hover-only"
                              fill="clear"
                              size="small"
                              title="Opciones"
                            >
                              <ion-icon
                                :icon="ellipsisVerticalOutline"
                              ></ion-icon>
                            </ion-button>

                            <ion-popover
                              :trigger="`options-btn-${inc.id}`"
                              :keep-contents-mounted="true"
                              @did-dismiss="
                                () => emit('options-popover-did-dismiss')
                              "
                            >
                              <ion-content class="ion-padding">
                                <ion-button
                                  fill="clear"
                                  color="danger"
                                  style="
                                    width: 100%;
                                    justify-content: flex-start;
                                  "
                                  @click="
                                    handleLocalDeleteIngreso(inc.id, $event)
                                  "
                                >
                                  <ion-icon
                                    slot="start"
                                    :icon="trashOutline"
                                  ></ion-icon>
                                  Eliminar ingreso
                                </ion-button>
                              </ion-content>
                            </ion-popover>
                          </ion-item>
                        </template>
                      </ion-list>
                    </div>
                  </ion-accordion>
                </ion-accordion-group>

                <ion-item v-else lines="full" class="income-item">
                  <ion-icon
                    slot="start"
                    :icon="
                      block.item.entryType === 'egreso'
                        ? arrowBackOutline
                        : arrowForwardOutline
                    "
                    :color="
                      block.item.entryType === 'egreso' ? 'danger' : 'success'
                    "
                  ></ion-icon>

                  <ion-select
                    slot="start"
                    :value="block.item.paymentType"
                    aria-label="Tipo de pago"
                    interface="popover"
                    @ion-change="
                      e =>
                        emit('update-ingreso', {
                          id: block.item.id,
                          changes: { paymentType: e?.detail?.value },
                        })
                    "
                  >
                    <ion-select-option value="cash">Efectivo</ion-select-option>
                    <ion-select-option value="digital"
                      >Digital</ion-select-option
                    >
                  </ion-select>

                  <template
                    v-if="
                      !(
                        block.item.entryType === 'egreso' &&
                        (block.item._fromProviderGroupId ||
                          block.item._providerName)
                      )
                    "
                  >
                    <ion-input
                      :value="block.item.name"
                      placeholder="Nombre"
                      @ion-input="
                        e =>
                          emit('update-ingreso', {
                            id: block.item.id,
                            changes: { name: e?.detail?.value },
                          })
                      "
                    ></ion-input>
                  </template>
                  <template v-else>
                    <ion-label class="provider-name">{{
                      block.item._providerName || block.item.name
                    }}</ion-label>
                  </template>

                  <ion-input
                    :value="block.item.amount"
                    placeholder="Cantidad"
                    type="number"
                    class="num-input"
                    @ion-input="
                      e =>
                        emit('update-ingreso', {
                          id: block.item.id,
                          changes: { amount: Number(e?.detail?.value) || 0 },
                        })
                    "
                  ></ion-input>

                  <ion-note slot="end">{{
                    formatTimeLocal(block.item.createdAt)
                  }}</ion-note>

                  <ion-button
                    :id="`options-btn-${block.item.id}`"
                    slot="end"
                    class="hover-only"
                    fill="clear"
                    size="small"
                    title="Opciones"
                  >
                    <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
                  </ion-button>

                  <ion-popover
                    :trigger="`options-btn-${block.item.id}`"
                    :keep-contents-mounted="true"
                    @did-dismiss="() => emit('options-popover-did-dismiss')"
                  >
                    <ion-content class="ion-padding">
                      <ion-button
                        fill="clear"
                        color="danger"
                        style="width: 100%; justify-content: flex-start"
                        @click="handleLocalDeleteIngreso(block.item.id, $event)"
                      >
                        <ion-icon slot="start" :icon="trashOutline"></ion-icon>
                        liminar ingreso
                      </ion-button>
                    </ion-content>
                  </ion-popover>
                </ion-item>
              </template>

              <ion-item class="transparent" lines="none">
                <ion-label slot="end">{{
                  formatCurrencyLocal({ v: totalIngresos })
                }}</ion-label>
              </ion-item>
            </template>

            <template v-else>
              <div class="ion-padding">
                <ion-label
                  >Pulsa el botón «+» para agregar un nuevo ingreso</ion-label
                >
              </div>
            </template>
          </div>
        </ion-list>
      </ion-col>

      <ion-col size="2">
        <ion-grid>
          <SummaryCards
            :total-ingresos-only="totalIngresosOnly"
            :total-egresos="totalEgresos"
            :total-estimacion-efectivo-tarjeta="
              props.totalEstimacionEfectivoTarjeta
            "
            :providers="props.providers"
            :selected-date="props.selectedDate"
            :faltante="props.faltante"
            :credito-value="totalEgresos"
          />
        </ion-grid>
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- addEntryType popover -->
  <ion-popover
    :is-open="localPopovers.addEntryType.open"
    :event="localPopovers.addEntryType.event"
    :keep-contents-mounted="true"
    @did-dismiss="() => (localPopovers.addEntryType.open = false)"
  >
    <ion-content>
      <ion-list>
        <ion-item
          button
          lines="full"
          @click="
            ((localPopovers.addEntryType.open = false),
            onSelectEntryTypeLocal('ingreso', $event))
          "
        >
          <ion-icon
            slot="start"
            color="success"
            :icon="arrowForwardOutline"
          ></ion-icon>

          <ion-label>Ingreso</ion-label>
        </ion-item>

        <ion-item
          button
          lines="full"
          @click="
            ((localPopovers.addEntryType.open = false),
            onSelectEntryTypeLocal('egreso', $event))
          "
        >
          <ion-icon
            slot="start"
            color="danger"
            :icon="arrowBackOutline"
          ></ion-icon>
          <ion-label>Egreso</ion-label>
        </ion-item>
      </ion-list>

      <ion-accordion-group>
        <ion-accordion value="first">
          <ion-item slot="header" color="light">
            <ion-label>Provedores</ion-label>
          </ion-item>

          <div slot="content" class="ion-padding">
            <ion-list>
              <template v-if="providersToday && providersToday.length">
                <ion-item
                  v-for="p in providersToday"
                  :key="p.id"
                  lines="none"
                  class="transparent"
                  button
                  @click="() => addProviderEgresos(p)"
                >
                  <ion-label>{{ p.name }}</ion-label>
                </ion-item>
              </template>

              <template v-else>
                <ion-item>
                  <ion-label>No hay proveedores para este día</ion-label>
                </ion-item>
              </template>
            </ion-list>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-content>
  </ion-popover>

  <!-- delete group confirmation alert -->
  <ion-alert
    :is-open="deleteGroupConfirm.open"
    header="Eliminar gastos"
    :message="`¿Eliminar todos los gastos del proveedor «${deleteGroupConfirm.providerName}»? Esta acción no se puede deshacer.`"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => {
          deleteGroupConfirm.open = false;
          deleteGroupConfirm.groupId = null;
          deleteGroupConfirm.providerName = '';
        },
      },
      { text: 'Eliminar', cssClass: 'danger', handler: () => doDeleteGroup() },
    ]"
    @did-dismiss="
      () => {
        deleteGroupConfirm.open = false;
        deleteGroupConfirm.groupId = null;
        deleteGroupConfirm.providerName = '';
      }
    "
  ></ion-alert>
  <!-- end delete group confirmation alert -->
</template>

<script setup lang="ts">
import {
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonNote,
  IonItem,
  IonPopover,
  IonAlert,
  IonContent,
  IonAccordion,
  IonAccordionGroup,
} from '@ionic/vue';
import {
  addOutline,
  trashOutline,
  ellipsisVerticalOutline,
  arrowBackOutline,
  arrowForwardOutline,
  personOutline,
} from 'ionicons/icons';
import SummaryCards from './components/SummaryCards.vue';
import { PropType, computed } from 'vue';

interface InicioProps {
  entries: any[];
  controlsDisabled: boolean;
  totalEstimacionEfectivoTarjeta: number;
  faltante: number;
  // kept optional for compatibility with parent bindings
  totalIngresosOnly?: number;
  totalEgresos?: number;
  // providers for the selected date (passed from parent)
  providers?: any[];
  selectedDate?: string;
}

const props = defineProps<InicioProps>();

import { ref, reactive } from 'vue';

const totalIngresosOnly = computed(() => {
  try {
    if (!Array.isArray(props.entries)) return 0;
    return props.entries.reduce(
      (s, item) =>
        s + (item?.entryType === 'ingreso' ? Number(item?.amount) || 0 : 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

const totalEgresos = computed(() => {
  try {
    if (!Array.isArray(props.entries)) return 0;
    return props.entries.reduce(
      (s, item) =>
        s + (item?.entryType === 'egreso' ? Number(item?.amount) || 0 : 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

const totalIngresos = computed(() => {
  try {
    if (!Array.isArray(props.entries)) return 0;
    return props.entries.reduce(
      (s, item) =>
        s +
        (item?.entryType === 'egreso'
          ? -Number(item?.amount) || 0
          : Number(item?.amount) || 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

function formatCurrencyLocal(params: { v: number }) {
  const { v } = params || { v: 0 };
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(v || 0);
  } catch (_e) {
    return String(v || 0);
  }
}

function formatTimeLocal(ms?: number) {
  try {
    if (!ms) return '';
    const d = new Date(Number(ms));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_e) {
    return '';
  }
}

// Compute providers for the selected date (match exact YYYY-MM-DD)
const providersToday = computed(() => {
  try {
    const list = Array.isArray(props.providers) ? props.providers : [];
    const sel = String(props.selectedDate || '').slice(0, 10);
    if (!sel) return [];
    return list.filter((p: any) => String(p.date || '').slice(0, 10) === sel);
  } catch (_e) {
    return [];
  }
});

// Totales locales por método de pago para los proveedores del día (uso en este componente)
const totalEstimacionEfectivoLocal = computed(() => {
  try {
    return (providersToday.value || []).reduce(
      (s: number, p: any) => s + Number(p.efectivo || 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});

const totalEstimacionDigitalLocal = computed(() => {
  try {
    return (providersToday.value || []).reduce(
      (s: number, p: any) => s + Number(p.tarjeta || 0),
      0
    );
  } catch (_e) {
    return 0;
  }
});
const emit = defineEmits([
  'delete-ingreso',
  'options-popover-did-dismiss',
  'update-ingreso',
  'create-entry',
  'add-egresos',
  'delete-egresos-group',
]);

const localPopovers = reactive({
  addEntryType: { open: false, event: null as any },
});

// Confirmation state for deleting a provider's grouped egresos
const deleteGroupConfirm = reactive({
  open: false,
  groupId: null as string | number | null,
  providerName: '' as string,
});

function confirmDeleteGroup(groupId: string | number, providerName?: string) {
  try {
    deleteGroupConfirm.groupId = groupId;
    deleteGroupConfirm.providerName = String(providerName || '');
    deleteGroupConfirm.open = true;
  } catch (_e) {
    /* noop */
  }
}

function doDeleteGroup() {
  try {
    const gid = deleteGroupConfirm.groupId;
    deleteGroupConfirm.open = false;
    if (!gid) return;
    emit('delete-egresos-group', gid);
  } catch (e) {
    console.error('doDeleteGroup error', e);
  } finally {
    deleteGroupConfirm.groupId = null;
    deleteGroupConfirm.providerName = '';
  }
}

function onSelectEntryTypeLocal(type: 'ingreso' | 'egreso', ev?: any) {
  try {
    // Close local popover
    localPopovers.addEntryType.open = false;
    // Emit event for parent to create the entry (parent owns entries state)
    emit('create-entry', type);
    // try to dismiss native popover element
    try {
      const popoverEl =
        ev?.currentTarget?.closest && ev.currentTarget.closest('ion-popover');
      if (popoverEl && typeof popoverEl.dismiss === 'function')
        popoverEl.dismiss();
    } catch (_e) {}
  } catch (err) {
    console.error('onSelectEntryTypeLocal error:', err);
  }
}

// Emit egresos for a provider when clicked
function addProviderEgresos(provider: any) {
  try {
    if (!provider || !provider.name) return;
    const toAdd: any[] = [];
    const dateStr = String(props.selectedDate || '') || undefined;
    const now = Date.now();

    const pushIf = (
      amount: any,
      label: string,
      paymentType: 'cash' | 'digital'
    ) => {
      const v = Number(amount || 0);
      if (v > 0) {
        toAdd.push({
          id: Date.now() + Math.random(),
          name: `${provider.name}${label ? ' - ' + label : ''}`,
          amount: v,
          date: dateStr,
          paymentType: paymentType,
          entryType: 'egreso',
          createdAt: now,
        });
      }
    };

    pushIf(provider.efectivo, 'efectivo', 'cash');
    pushIf(provider.tarjeta, 'tarjeta', 'digital');
    pushIf(provider.credito, 'credito', 'cash');

    if (toAdd.length) {
      // Attach grouping metadata so parent entries can be rendered as a block
      const groupId = `prov-${provider.id ?? 'x'}-${Date.now()}`;
      toAdd.forEach(t => {
        t._fromProviderGroupId = groupId;
        t._providerName = String(provider.name || 'Proveedor');
      });
      emit('add-egresos', toAdd);
    }
  } catch (e) {
    console.error('addProviderEgresos error', e);
  }
}

// Group entries for rendering: consecutive items with same _fromProviderGroupId
const renderedEntries = computed(() => {
  try {
    const list = Array.isArray(props.entries) ? props.entries : [];
    const out: any[] = [];
    let i = 0;
    while (i < list.length) {
      const cur = list[i];
      if (cur && cur._fromProviderGroupId) {
        const gid = cur._fromProviderGroupId;
        let j = i + 1;
        while (
          j < list.length &&
          list[j] &&
          list[j]._fromProviderGroupId === gid
        )
          j++;
        const itemsSlice = list.slice(i, j);
        const total = itemsSlice.reduce(
          (s: number, it: any) => s + (Number(it?.amount) || 0),
          0
        );
        out.push({
          type: 'group',
          groupId: gid,
          providerName: cur._providerName || cur.name || 'Proveedor',
          items: itemsSlice,
          total,
        });
        i = j;
      } else {
        out.push({ type: 'item', item: cur });
        i++;
      }
    }
    return out;
  } catch (_e) {
    return [];
  }
});

function handleLocalDeleteIngreso(id: string | number, ev?: any) {
  try {
    let dismissed = false;
    try {
      const popoverEl =
        ev?.currentTarget?.closest && ev.currentTarget.closest('ion-popover');
      if (popoverEl && typeof popoverEl.dismiss === 'function') {
        popoverEl.dismiss();
        dismissed = true;
      }
    } catch (_e) {}

    if (!dismissed) {
      try {
        const selector = `ion-popover[trigger="options-btn-${String(id)}"]`;
        const popoverFallback = document.querySelector(selector) as any;
        if (popoverFallback && typeof popoverFallback.dismiss === 'function') {
          popoverFallback.dismiss();
          dismissed = true;
        }
      } catch (_e) {}
    }

    if (!dismissed) {
      try {
        const anyOpen = document.querySelector('ion-popover[is-open]') as any;
        if (anyOpen && typeof anyOpen.dismiss === 'function') anyOpen.dismiss();
      } catch (_e) {}
    }
  } catch (err) {
    console.error('handleLocalDeleteIngreso error', err);
  } finally {
    try {
      emit('delete-ingreso', id);
    } catch (_e) {}
  }
}

function blockKey(block: any, idx: number) {
  try {
    if (!block) return `b-${idx}`;
    if (block.type === 'group') return `g-${String(block.groupId || idx)}`;
    return `i-${String((block.item && block.item.id) || idx)}`;
  } catch (_e) {
    return `b-${idx}`;
  }
}
</script>
