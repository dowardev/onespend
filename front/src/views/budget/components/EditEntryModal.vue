<template>
  <ion-modal
    :is-open="isOpen"
    :keep-contents-mounted="true"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$emit('dismiss')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          entryData.id ? 'Editar Entrada' : 'Nueva Entrada'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button
            v-if="entryData.id"
            fill="clear"
            color="danger"
            :disabled="isDayClosed"
            @click="$emit('delete')"
          >
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>

          <ion-button
            :disabled="!isFormValid || isDayClosed"
            @click="handleSave"
          >
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-end">
      <ion-grid v-if="!entryData.id">
        <ion-row class="ion-justify-content-center">
          <ion-col size="6">
            <ion-segment v-model="addEntrySegment" scrollable>
              <ion-segment-button value="entry">
                <ion-label>Registro</ion-label>
              </ion-segment-button>

              <ion-segment-button value="provider">
                <ion-label>Proveedores</ion-label>
              </ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <template v-if="!entryData.id && addEntrySegment === 'entry'">
        <ion-list class="transparent">
          <div class="list-content">
            <ion-item lines="full" class="transparent">
              <ion-select
                v-model="entryData.entryType"
                interface="popover"
                label="Tipo"
                label-placement="stacked"
              >
                <ion-select-option value="ingreso">Ingreso</ion-select-option>

                <ion-select-option value="egreso">Egreso</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>

              <ion-input
                v-model="entryData.name"
                placeholder="Nombre"
              ></ion-input>
            </ion-item>
          </div>
        </ion-list>

        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Detalles</ion-label>

            <ion-button
              :disabled="!canAddMoreItems || isDayClosed"
              @click="addEntryItem"
            >
              <ion-icon :icon="addOutline"></ion-icon>
              Agregar
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <ion-card
              v-for="(item, index) in entryItems"
              :key="index"
              class="shadow1"
            >
              <ion-item lines="full" class="transparent">
                <ion-label position="stacked">Cantidad</ion-label>

                <ion-input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="0"
                ></ion-input>
              </ion-item>

              <ion-item class="transparent" lines="none">
                <ion-select
                  v-model="item.accountId"
                  interface="popover"
                  style="--border-width: 0px"
                  label="Cuenta"
                  label-placement="stacked"
                  :validate="true"
                  error-text="Selecciona una cuenta"
                >
                  <ion-select-option
                    v-for="acc in availableAccountsForItem(index)"
                    :key="acc.id"
                    :value="acc.id"
                  >
                    {{ acc.name }}
                  </ion-select-option>
                </ion-select>
                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  :disabled="isDayClosed"
                  @click="$emit('quick-account', index)"
                >
                  <ion-icon :icon="addOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </ion-card>

            <ion-note
              v-if="accountsList.length === 0"
              color="warning"
              class="ion-padding-start"
            >
              No hay cuentas. Crea una para continuar.
            </ion-note>
          </div>
        </ion-list>
      </template>

      <template v-if="!entryData.id && addEntrySegment === 'provider'">
        <ion-list>
          <div v-if="providersTodayWithData.length" class="list-content">
            <ion-item
              v-for="p in providersTodayWithData"
              :key="p.id"
              lines="full"
              :button="!!p.accountId && !isDayClosed"
              :disabled="!p.accountId || isDayClosed"
              @click="() => p.accountId && !isDayClosed && selectProvider({ provider: p })"
            >
              <ion-label>
                {{ p.name }}
                <p v-if="!p.accountId" style="color: var(--ion-color-warning)">
                  Sin cuenta asignada
                </p>
              </ion-label>
              <ion-note slot="end" :color="p.accountId ? 'primary' : 'medium'">
                {{ formatProviderAmount({ provider: p }) }}
              </ion-note>
            </ion-item>
          </div>

          <template v-else>
            <div class="ion-padding ion-text-center">
              <ion-label>No hay proveedores con datos para este día</ion-label>
            </div>
          </template>
        </ion-list>
      </template>

      <template v-if="entryData.id">
        <ion-list class="transparent">
          <div class="list-content">
            <ion-item class="transparent" lines="none">
              <ion-select
                v-model="entryData.entryType"
                label="Tipo"
                label-placement="stacked"
              >
                <ion-select-option value="ingreso">Ingreso</ion-select-option>

                <ion-select-option value="egreso">Egreso</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item class="transparent" lines="none">
              <ion-label position="stacked">Nombre</ion-label>

              <ion-input
                v-model="entryData.name"
                placeholder="Nombre"
              ></ion-input>
            </ion-item>
          </div>
        </ion-list>

        <ion-list class="transparent">
          <ion-list-header>
            <ion-label>Detalles</ion-label>

            <ion-button
              :disabled="!canAddMoreItems || isDayClosed"
              @click="addEntryItem"
            >
              <ion-icon :icon="addOutline"></ion-icon>
              Agregar
            </ion-button>
          </ion-list-header>

          <div class="list-content">
            <ion-card
              v-for="(item, index) in entryItems"
              :key="index"
              class="shadow2"
            >
              <ion-item class="transparent">
                <ion-label position="stacked">Cantidad</ion-label>

                <ion-input
                  v-model.number="item.amount"
                  type="number"
                  placeholder="0"
                ></ion-input>
              </ion-item>

              <ion-item class="transparent">
                <ion-select
                  v-model="item.accountId"
                  label="Cuenta"
                  label-placement="stacked"
                  :validate="true"
                  error-text="Selecciona una cuenta"
                >
                  <ion-select-option
                    v-for="acc in availableAccountsForItem(index)"
                    :key="acc.id"
                    :value="acc.id"
                  >
                    {{ acc.name }}
                  </ion-select-option>
                </ion-select>
                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  :disabled="isDayClosed"
                  @click="$emit('quick-account', index)"
                >
                  <ion-icon :icon="addOutline"></ion-icon>
                </ion-button>
              </ion-item>
              <ion-note
                v-if="accountsList.length === 0"
                color="warning"
                class="ion-padding-horizontal"
              >
                No hay cuentas. Crea una para continuar.
              </ion-note>

              <ion-item class="transparent" lines="none">
                <ion-button
                  slot="end"
                  color="danger"
                  fill="clear"
                  :disabled="isDayClosed"
                  >Eliminar</ion-button
                >
              </ion-item>
            </ion-card>
          </div>
        </ion-list>
      </template>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Imports
import {
  addOutline,
  closeOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';
import { computed, ref, watch } from 'vue';

interface EntryGroup {
  amount: number;
  accountId: string | number | null;
}

interface ProviderSummary {
  id: string | number;
  name: string;
  estimated: number;
  accountId: string | number | null;
}
// End Imports

// Components

// End Components

// Vars
const props = defineProps<{
  isOpen: boolean;
  entryData: {
    id: string | number | null;
    entryType: 'ingreso' | 'egreso';
    name: string;
    amount?: number;
    groups?: Array<{ amount: number; accountId: string | number | null }>;
  };
  accountsList: Array<{ id: string | number; name: string }>;
  isDayClosed: boolean;
  providersTodayWithData: Array<{
    id: string | number;
    name: string;
    estimated: number;
    accountId: string | number | null;
  }>;
}>();

const emit = defineEmits([
  'dismiss',
  'save',
  'delete',
  'quick-account',
  'select-provider',
]);

const addEntrySegment = ref('entry');
const entryItems = ref<Array<{ amount: number; accountId: string | number | null }>>([
  { amount: 0, accountId: null },
]);
// End Vars

// Functions
function getDefaultAccountId() {
  return props.accountsList.length > 0 ? props.accountsList[0].id : null;
}

const availableAccountsForItem = (currentIndex: number) => {
  const usedAccountIds = entryItems.value
    .filter((_: unknown, idx: number) => idx !== currentIndex)
    .map((item: { accountId: string | number | null }) => String(item.accountId))
    .filter((id: string) => id !== 'null' && id !== 'undefined' && id !== '');
  return props.accountsList.filter(
    (acc: { id: string | number }) => !usedAccountIds.includes(String(acc.id))
  );
};

function formatProviderAmount(params: { provider: ProviderSummary }) {
  const { provider } = params;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(provider?.estimated) || 0);
}

function selectProvider(params: { provider: ProviderSummary }) {
  const { provider } = params;
  emit('select-provider', provider);
}

function addEntryItem() {
  if (canAddMoreItems.value) {
    entryItems.value.push({ amount: 0, accountId: getDefaultAccountId() });
  }
}

function handleSave() {
  if (!isFormValid.value) return;

  const totalAmount = entryItems.value.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  emit('save', {
    entryType: entryData.value.entryType,
    name: entryData.value.name,
    amount: totalAmount,
    accountId: entryItems.value[0]?.accountId ?? null,
    groups: entryItems.value,
  });
}
// End Functions

// Life cycle

// End Life cycle

// Computed
const isFormValid = computed(() => {
  return (
    entryData.value.name.trim().length > 0 &&
    entryData.value.entryType &&
    entryItems.value.length > 0 &&
    entryItems.value.every(
      item => Number(item.amount) > 0 && item.accountId != null
    )
  );
});

const entryData = computed(() => props.entryData);

const canAddMoreItems = computed(() => {
  return entryItems.value.length < props.accountsList.length + 2;
});
// End Computed

// Watch
watch(
  () => props.entryData.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      if (newId) {
        const newData = props.entryData;
        if (
          newData.groups &&
          Array.isArray(newData.groups) &&
          newData.groups.length > 0
        ) {
          entryItems.value = newData.groups.map((g: EntryGroup) => ({
            amount: Number(g.amount) || 0,
            accountId: g.accountId ?? getDefaultAccountId(),
          }));
        } else {
          entryItems.value = [
            {
              amount: Number(newData.amount) || 0,
              accountId: newData.accountId || getDefaultAccountId(),
            },
          ];
        }
      } else if (entryItems.value.length === 0 || 
                 (entryItems.value.length === 1 && entryItems.value[0].amount === 0)) {
        entryItems.value = [{ amount: 0, accountId: getDefaultAccountId() }];
        addEntrySegment.value = 'entry';
      }
    }
  },
  { immediate: true }
);
// End Watch
</script>
