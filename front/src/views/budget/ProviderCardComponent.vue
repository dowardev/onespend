<template>
  <ion-card
    :class="['shadow2', { 'provider-just-added': props.provider._justAdded }]"
  >
    <ion-item lines="none" class="transparent">
      <ion-checkbox
        slot="start"
        :checked="props.provider.visited"
        :disabled="props.isClosed"
        @ion-change="
          (e: IonEvent) =>
            emit('visited-changed', { provider: props.provider, event: e })
        "
      ></ion-checkbox>

      <div
        style="width: 100%"
        @click="() => emit('start-editing', { provider: props.provider })"
      >
        <ion-label v-if="props.provider.name && !props.provider._editing">{{
          props.provider.name
        }}</ion-label>

        <ion-input
          v-show="props.provider._editing || !props.provider.name"
          :ref="
            el => emit('register-name-input', { id: props.provider.id, el })
          "
          :value="props.provider.name"
          :placeholder="props.provider._dbName || 'Nombre proveedor'"
          @ion-input="
            (e: IonEvent) =>
              emit('update-provider', {
                id: props.provider.id,
                field: 'name',
                value: e?.detail?.value ?? e?.target?.value ?? '',
              })
          "
          @ion-blur="() => emit('stop-editing', { provider: props.provider })"
        ></ion-input>
      </div>
    </ion-item>

    <div
      style="display: flex; justify-content: space-between"
      class="ion-padding-start ion-padding-end"
    >
      <ion-input
        :value="props.provider.efectivo"
        label="Efectivo"
        label-placement="floating"
        type="number"
        class="num-input small"
        @ion-input="
          e =>
            emit('update-provider', {
              id: props.provider.id,
              field: 'efectivo',
              value: Number(e?.detail?.value ?? e?.target?.value ?? 0),
            })
        "
      ></ion-input>

      <ion-input
        :value="props.provider.tarjeta"
        label="Tarjeta/Transferencia"
        label-placement="floating"
        type="number"
        class="num-input small"
        @ion-input="
          e =>
            emit('update-provider', {
              id: props.provider.id,
              field: 'tarjeta',
              value: Number(e?.detail?.value ?? e?.target?.value ?? 0),
            })
        "
      ></ion-input>

      <ion-input
        :value="props.provider.credito"
        label="Credito"
        label-placement="floating"
        type="number"
        class="num-input small"
        @ion-input="
          e =>
            emit('update-provider', {
              id: provider.id,
              field: 'credito',
              value: Number(e?.detail?.value ?? e?.target?.value ?? 0),
            })
        "
      ></ion-input>

      <ion-label
        :color="
          isPaymentPrimary({ provider: props.provider }) ? 'primary' : undefined
        "
      >
        {{ formattedValue }}
      </ion-label>
    </div>

    <ion-item lines="none">
      <ion-button slot="end" fill="clear" @click="openPopover($event)">
        <ion-icon :icon="calendarOutline"> </ion-icon>
      </ion-button>

      <ion-button
        v-if="props.hasProducts"
        slot="end"
        fill="clear"
        size="small"
        title="Ver productos"
        class="icon-btn"
        @click.stop="
          emit('open-products-popover', {
            provider: props.provider,
            event: $event,
          })
        "
      >
        <ion-icon :icon="listOutline"></ion-icon>
      </ion-button>

      <ion-button
        slot="end"
        fill="clear"
        @click.stop="
          (e: IonEvent) => emit('open-notes-modal', { provider, event: e })
        "
      >
        <ion-icon :icon="bookOutline"></ion-icon>
      </ion-button>

      <ion-button slot="end" fill="clear">
        <ion-icon :icon="timeOutline"></ion-icon>
      </ion-button>

      <ion-button
        slot="end"
        fill="clear"
        size="small"
        title="Eliminar proveedor"
        class="icon-btn"
        @click.stop="
          (e: IonEvent) =>
            emit('confirm-remove-proveedor', {
              id: provider.id,
              name: provider.name,
              event: e,
            })
        "
      >
        <ion-icon :icon="trashOutline"></ion-icon>
      </ion-button>
    </ion-item>
  </ion-card>

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.open"
    :event="popovers.event"
    keep-contents-mounted="true"
    @did-dismiss="popovers.open = false"
  >
    <ion-content>
      <ion-item lines="none">
        <ion-label>Mover provedor</ion-label>
      </ion-item>

      <ion-datetime
        :show-default-buttons="true"
        presentation="date"
        style="background: transparent"
        done-text="Confirmar"
        cancel-text="Cancelar"
        @ion-change="onDateChange({ value: $event?.detail?.value })"
      >
      </ion-datetime>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->
</template>

<script setup lang="ts">
import {
  IonCard,
  IonItem,
  IonCheckbox,
  IonInput,
  IonLabel,
  IonButton,
  IonIcon,
  IonPopover,
  IonDatetime,
} from '@ionic/vue';
import {
  listOutline,
  bookOutline,
  timeOutline,
  trashOutline,
  calendarOutline,
} from 'ionicons/icons';
import { reactive, computed } from 'vue';

// interface
interface Provider {
  id: string | number;
  name?: string;
  _dbName?: string;
  _editing?: boolean;
  _justAdded?: boolean;
  visited?: boolean;
  efectivo?: number;
  tarjeta?: number;
  credito?: number;
  // Optional fields used by parent backups: estimate/dollar fallback
  dollar?: number;
  estimated?: number;
}

// Generic Ion event shape used in template handlers
type IonEvent = {
  detail?: { value?: string | number | string[] | null };
  target?: { value?: string | number | null };
};

// end inteface

// main
const props = defineProps<{
  provider: Provider;
  hasProducts?: boolean;
  isClosed?: boolean;
}>();

const emit = defineEmits([
  'update-provider',
  'register-name-input',
  'visited-changed',
  'start-editing',
  'stop-editing',
  'open-products-popover',
  'open-notes-modal',
  'confirm-remove-proveedor',
  'move-provider',
]);
// end main

// vars
const popovers = reactive({
  open: false,
  event: null as Event | null,
  provider: null as Provider | null,
});
// end vars

// computed
const formattedValue = computed(() => {
  try {
    const p = props.provider || ({} as Provider);
    const efectivo = Number(p.efectivo || 0);
    const tarjeta = Number(p.tarjeta || 0);
    const credito = Number(p.credito || 0);
    const sumPayments = efectivo + tarjeta + credito;
    let v = 0;
    if (sumPayments > 0) v = sumPayments;
    else if ((Number(p.dollar) || 0) > 0) v = Number(p.dollar || 0);
    else v = Number(p.estimated || 0) || 0;
    return formatCurrency({ v });
  } catch (_e) {
    return '';
  }
});
// end computed

// functions
function openPopover(event: Event) {
  popovers.event = event;
  popovers.open = true;
  popovers.provider = props.provider;
}

function onDateChange(
  params: { value?: string | number | string[] | null } = {}
) {
  let { value } = params;

  // allow null/undefined to be passed; if null/undefined, exit early
  if (value == null) {
    return;
  }
  // If value is an array (ion-datetime can return an array), take the first element
  if (Array.isArray(value)) {
    value = value[0] as string | number;
  }
  const date = new Date(value as string | number);
  emit('move-provider', {
    provider: popovers.provider ?? props.provider,
    date,
  });
  popovers.open = false;
}

function isPaymentPrimary(params: { provider?: Provider } | any) {
  try {
    const p =
      params && params.provider !== undefined ? params.provider : params;
    const efectivo = Number(p?.efectivo || 0);
    const tarjeta = Number(p?.tarjeta || 0);
    return efectivo > 0 || tarjeta > 0;
  } catch (_e) {
    return false;
  }
}

// local formatter: format numbers as MXN currency
function formatCurrency(params: { v: number }) {
  const { v } = params;
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(v) || 0);
  } catch (_e) {
    return String(Number(v) || 0);
  }
}

// computed formattedValue local to this component
</script>

<style scoped>
.icon-btn {
  color: var(--ion-color-danger, #d9534f);
}
</style>
