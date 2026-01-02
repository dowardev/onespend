<template>
  <ion-card
    :class="[
      'shadow2',
      {
        'provider-just-added': props.provider._justAdded,
        'provider-disabled': props.isDisabled,
      },
    ]"
  >
    <ion-item lines="none" class="transparent">
      <ion-input
        :value="props.provider.name"
        placeholder="Nombre"
        :disabled="props.isDisabled"
        @ion-input="
          (e: IonEvent) =>
            emit('update-provider', {
              id: props.provider.id,
              field: 'name',
              value: e?.detail?.value ?? e?.target?.value ?? '',
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

      <ion-button
        slot="end"
        fill="clear"
        @click.stop="openOptionsPopover($event)"
      >
        <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
      </ion-button>
    </ion-item>

    <div
      style="
        display: flex;
        justify-content: space-between;
        background-color: var(--ion-background-color);
      "
      class="ion-padding-start ion-padding-end"
    >
      <ion-input
        :value="props.provider.efectivo"
        label="Efectivo"
        label-placement="floating"
        type="number"
        class="num-input small"
        :disabled="props.isDisabled"
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
        :disabled="props.isDisabled"
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
        :disabled="props.isDisabled"
        @ion-input="
          e =>
            emit('update-provider', {
              id: provider.id,
              field: 'credito',
              value: Number(e?.detail?.value ?? e?.target?.value ?? 0),
            })
        "
      ></ion-input>
    </div>
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

  <!-- options popover (separate del calendario) -->
  <ion-popover
    :is-open="optionsPopover.open"
    :event="optionsPopover.event"
    keep-contents-mounted="true"
    @did-dismiss="closeOptionsPopover"
  >
    <ion-content>
      <ion-list>
        <!-- move -->
        <ion-item button lines="none" @click="onMoveFromOptions($event)">
          <ion-icon slot="start" :icon="swapHorizontalOutline"></ion-icon>

          <ion-label>Mover</ion-label>
        </ion-item>

        <!-- products -->
        <ion-item
          v-if="props.hasProducts"
          button
          lines="none"
          @click="onProductsFromOptions($event)"
        >
          <ion-icon slot="start" :icon="listOutline"></ion-icon>

          <ion-label>Ver productos</ion-label>
        </ion-item>

        <!-- notes -->
        <ion-item button lines="none" @click="onNotesFromOptions($event)">
          <ion-icon slot="start" :icon="bookOutline"></ion-icon>

          <ion-label>Notas</ion-label>
        </ion-item>

        <ion-item button lines="none" @click="onDeleteFromOptions($event)">
          <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>

          <ion-label class="danger">Eliminar</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
  <!-- end options popover -->

  <!-- delete confirm local to this card -->
  <ion-alert
    :is-open="deleteConfirm.open"
    header="Confirmar eliminación"
    :message="`¿Eliminar proveedor «${props.provider?.name || ''}»? Esta acción no se puede deshacer.`"
    :buttons="[
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => (deleteConfirm.open = false),
      },
      { text: 'Eliminar', cssClass: 'danger', handler: () => confirmDelete() },
    ]"
    @did-dismiss="() => (deleteConfirm.open = false)"
  ></ion-alert>
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
  IonAlert,
} from '@ionic/vue';
import {
  listOutline,
  bookOutline,
  timeOutline,
  trashOutline,
  calendarOutline,
  ellipsisVerticalOutline,
  swapHorizontalOutline,
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
  isDisabled?: boolean;
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

// options popover state
const optionsPopover = reactive({
  open: false,
  event: null as Event | null,
  provider: null as Provider | null,
});

// delete confirm state local to this component
const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
  event: null as Event | null,
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

function openOptionsPopover(event: Event) {
  optionsPopover.event = event;
  optionsPopover.open = true;
  optionsPopover.provider = props.provider;
}

function closeOptionsPopover() {
  optionsPopover.open = false;
  optionsPopover.event = null;
  optionsPopover.provider = null;
}

function onEditFromOptions(e: Event) {
  try {
    emit('start-editing', {
      provider: optionsPopover.provider ?? props.provider,
    });
  } catch (err) {
    console.error('onEditFromOptions error', err);
  } finally {
    closeOptionsPopover();
  }
}

function onNotesFromOptions(e: Event) {
  try {
    emit('open-notes-modal', {
      provider: optionsPopover.provider ?? props.provider,
      event: e,
    });
  } catch (err) {
    console.error('onNotesFromOptions error', err);
  } finally {
    closeOptionsPopover();
  }
}

function onDeleteFromOptions(e: Event) {
  try {
    // Close options then open delete confirm passing the event
    closeOptionsPopover();
    openDeleteConfirm(e);
  } catch (err) {
    console.error('onDeleteFromOptions error', err);
  }
}

// Open products view after closing the options popover
function onProductsFromOptions(e: Event) {
  try {
    closeOptionsPopover();
    emit('open-products-popover', {
      provider: optionsPopover.provider ?? props.provider,
      event: e,
    });
  } catch (err) {
    console.error('onProductsFromOptions error', err);
  }
}

// Open move (date) popover after closing the options popover
function onMoveFromOptions(e: Event) {
  try {
    closeOptionsPopover();
    // reuse the existing popover used for moving
    openPopover(e);
  } catch (err) {
    console.error('onMoveFromOptions error', err);
  }
}

function openDeleteConfirm(e: Event) {
  try {
    console.log('ProviderCardComponent.openDeleteConfirm', {
      id: props.provider?.id,
      name: props.provider?.name,
    });
    deleteConfirm.open = true;
    deleteConfirm.providerId = props.provider?.id ?? null;
    deleteConfirm.providerName = props.provider?.name || '';
    deleteConfirm.event = e;
  } catch (err) {
    console.error('openDeleteConfirm error', err);
  }
}

function confirmDelete() {
  try {
    console.log('ProviderCardComponent.confirmDelete', {
      id: deleteConfirm.providerId,
      name: deleteConfirm.providerName,
    });
    const payload = {
      id: deleteConfirm.providerId,
      name: deleteConfirm.providerName,
      event: deleteConfirm.event,
    };
    emit('confirm-remove-proveedor', payload);
  } catch (err) {
    console.error('confirmDelete error', err);
  } finally {
    deleteConfirm.open = false;
    deleteConfirm.providerId = null;
    deleteConfirm.providerName = '';
    deleteConfirm.event = null;
  }
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

.provider-disabled {
  opacity: 0.6;
  pointer-events: none;
}
</style>
