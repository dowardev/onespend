<template>
  <ion-grid>
    <ion-row class="ion-justify-content-center">
      <ion-col size="6">
        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Registro</ion-label>

            <ion-button
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
            <template v-if="store.entries.length > 0">
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
                                  store.updateIngreso(inc.id, {
                                    paymentType: e?.detail?.value,
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
                                  store.updateIngreso(inc.id, {
                                    amount: Number(e?.detail?.value) || 0,
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
                            >
                              <ion-content class="ion-padding">
                                <ion-button
                                  fill="clear"
                                  color="danger"
                                  style="
                                    width: 100%;
                                    justify-content: flex-start;
                                  "
                                  @click="store.removeIngreso(inc.id)"
                                >
                                  <ion-icon
                                    slot="start"
                                    :icon="trashOutline"
                                  ></ion-icon>
                                  Eliminar
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
                        store.updateIngreso(block.item.id, {
                          paymentType: e?.detail?.value,
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
                          store.updateIngreso(block.item.id, {
                            name: String(e?.detail?.value ?? ''),
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
                        store.updateIngreso(block.item.id, {
                          amount: Number(e?.detail?.value) || 0,
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
                  >
                    <ion-content class="ion-padding">
                      <ion-button
                        fill="clear"
                        color="danger"
                        style="width: 100%; justify-content: flex-start"
                        @click="store.removeIngreso(block.item.id)"
                      >
                        <ion-icon slot="start" :icon="trashOutline"></ion-icon>
                        Eliminar
                      </ion-button>
                    </ion-content>
                  </ion-popover>
                </ion-item>
              </template>

              <ion-item class="transparent" lines="none">
                <ion-label slot="end">{{
                  formatCurrencyLocal({ v: store.netTotal })
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

      <ion-col size="3">
        <ion-grid>
          <SummaryCards
            :total-ingresos-only="store.totalIngresos"
            :total-egresos="store.totalEgresos"
            :total-estimacion-efectivo-tarjeta="store.totalEstimacion"
            :providers="store.providers"
            :selected-date="store.selectedDate"
            :faltante="store.faltante"
            :credito-value="store.totalEgresos"
          />
        </ion-grid>
      </ion-col>
    </ion-row>
  </ion-grid>

  <ion-popover
    :is-open="localPopovers.addEntryType.open"
    :event="localPopovers.addEntryType.event"
    :keep-contents-mounted="true"
    @did-dismiss="localPopovers.addEntryType.open = false"
  >
    <ion-content>
      <ion-list>
        <ion-item
          button
          lines="full"
          @click="onSelectEntryType('ingreso', $event)"
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
          @click="onSelectEntryType('egreso', $event)"
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
            <ion-label>Proveedores</ion-label>
          </ion-item>

          <div slot="content" class="ion-padding">
            <ion-list>
              <template v-if="providersToday.length">
                <ion-item
                  v-for="p in providersToday"
                  :key="p.id"
                  lines="none"
                  class="transparent"
                  button
                  @click="() => store.addProviderEgresos(p)"
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
      { text: 'Eliminar', cssClass: 'danger', handler: doDeleteGroup },
    ]"
    @did-dismiss="
      () => {
        deleteGroupConfirm.open = false;
        deleteGroupConfirm.groupId = null;
        deleteGroupConfirm.providerName = '';
      }
    "
  ></ion-alert>
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
import { computed, reactive, watch } from 'vue';
import { useBudgetStore } from '@/stores/budgetStore';

const props = defineProps<{}>();

const store = useBudgetStore();

const localPopovers = reactive({
  addEntryType: { open: false, event: null as any },
});

const deleteGroupConfirm = reactive({
  open: false,
  groupId: null as string | number | null,
  providerName: '' as string,
});

const providersToday = computed(() => {
  const sel = String(store.selectedDate || '').slice(0, 10);
  if (!sel) return [];
  return store.providers.filter(
    (p: any) => String(p.date || '').slice(0, 10) === sel
  );
});

const renderedEntries = computed(() => {
  const list = store.entries;
  const out: any[] = [];
  let i = 0;
  while (i < list.length) {
    const cur = list[i];
    if (cur && cur._fromProviderGroupId) {
      const gid = cur._fromProviderGroupId;
      let j = i + 1;
      while (j < list.length && list[j] && list[j]._fromProviderGroupId === gid)
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
});

function formatCurrencyLocal(params: { v: number }) {
  const { v } = params || { v: 0 };
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(v || 0);
}

function formatTimeLocal(ms?: number) {
  if (!ms) return '';
  return new Date(Number(ms)).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function confirmDeleteGroup(groupId: string | number, providerName?: string) {
  deleteGroupConfirm.groupId = groupId;
  deleteGroupConfirm.providerName = String(providerName || '');
  deleteGroupConfirm.open = true;
}

function doDeleteGroup() {
  const gid = deleteGroupConfirm.groupId;
  deleteGroupConfirm.open = false;
  if (gid) store.removeEgresosGroup(gid);
  deleteGroupConfirm.groupId = null;
  deleteGroupConfirm.providerName = '';
}

function onSelectEntryType(type: 'ingreso' | 'egreso', ev?: any) {
  localPopovers.addEntryType.open = false;
  if (type === 'ingreso') {
    store.addIngreso({});
  } else {
    store.addEgreso({});
  }
}

function blockKey(block: any, idx: number) {
  if (!block) return `b-${idx}`;
  if (block.type === 'group') return `g-${String(block.groupId || idx)}`;
  return `i-${String((block.item && block.item.id) || idx)}`;
}
</script>
