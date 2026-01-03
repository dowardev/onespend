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
                <ion-item
                  v-if="block.type === 'item'"
                  lines="full"
                  class="income-item"
                >
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
                    :dismiss-on-select="true"
                  >
                    <ion-content>
                      <ion-item
                        lines="none"
                        button
                        @click="store.removeIngreso(block.item.id)"
                      >
                        <ion-icon
                          slot="start"
                          color="danger"
                          :icon="trashOutline"
                        ></ion-icon>

                        <ion-label> Eliminar </ion-label>
                      </ion-item>
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
            :faltante="store.faltante"
            :total-ingresos-efectivo="store.ingresosEfectivo"
            :total-ingresos-tarjeta="store.ingresosTarjeta"
            :total-egresos-efectivo="store.egresosEfectivo"
            :total-egresos-tarjeta="store.egresosTarjeta"
          />
        </ion-grid>
      </ion-col>
    </ion-row>
  </ion-grid>

  <!-- popovers -->
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

          <div slot="content">
            <ion-list>
              <template v-if="providersTodayWithData.length">
                <ion-item
                  v-for="p in providersTodayWithData"
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
                  <ion-label
                    >No hay proveedores con datos para este día</ion-label
                  >
                </ion-item>
              </template>
            </ion-list>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->
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
  IonContent,
} from '@ionic/vue';
import {
  addOutline,
  trashOutline,
  ellipsisVerticalOutline,
  arrowBackOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import SummaryCards from './components/SummaryCards.vue';
import { computed, reactive, watch } from 'vue';
import { useBudgetStore } from '@/stores/budgetStore';

const props = defineProps<{}>();

const store = useBudgetStore();

const localPopovers = reactive({
  addEntryType: { open: false, event: null as any },
});

const providersToday = computed(() => {
  const sel = String(store.selectedDate || '').slice(0, 10);
  if (!sel) return [];
  const addedIds = store.providerIdsWithEntries;
  return store.providers.filter(
    (p: any) => String(p.date || '').slice(0, 10) === sel && !addedIds.has(p.id)
  );
});

const providersTodayWithData = computed(() => {
  return providersToday.value.filter((p: any) => {
    return (
      Number(p?.efectivo) > 0 ||
      Number(p?.tarjeta) > 0 ||
      Number(p?.dollar) > 0 ||
      Number(p?.estimated) > 0
    );
  });
});

const renderedEntries = computed(() => {
  const list = store.entries;
  return list.map(item => ({ type: 'item', item }));
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
  return `i-${String((block.item && block.item.id) || idx)}`;
}
</script>
