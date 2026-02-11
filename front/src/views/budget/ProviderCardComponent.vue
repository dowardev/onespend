<template>
  <ion-item
    class="transparent"
    lines="full"
    button
    :disabled="isClosed"
    @click="!isClosed && handleItemClick($event)"
  >
    <ion-label>
      {{ props.provider._supplierName || props.provider.name || 'Sin nombre' }}
      <div style="display: flex">
        <div style="display: flex; align-items: center; margin-right: 4px">
          <ion-icon :icon="walletOutline" class="detail-icon"></ion-icon>
        </div>
        <div>{{ accountDisplay }}</div>
      </div>
    </ion-label>

    <ion-label slot="end">{{
      formatCurrency({ v: props.provider.estimated || 0 })
    }}</ion-label>
  </ion-item>

  <!-- popovers -->
  <ion-popover
    :is-open="popovers.open"
    :event="popovers.event"
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

  <ion-popover
    :is-open="optionsPopover.open"
    :event="optionsPopover.event"
    @did-dismiss="closeOptionsPopover"
  >
    <ion-content>
      <ion-list>
        <ion-item
          v-if="!isClosed"
          button
          lines="none"
          @click="onMoveFromOptions($event)"
        >
          <ion-icon slot="start" :icon="swapHorizontalOutline"></ion-icon>

          <ion-label>Mover</ion-label>
        </ion-item>

        <ion-item
          v-if="props.hasProducts && !isClosed"
          button
          lines="none"
          @click="onProductsFromOptions($event)"
        >
          <ion-icon slot="start" :icon="listOutline"></ion-icon>

          <ion-label>Ver productos</ion-label>
        </ion-item>

        <ion-item button lines="none" @click="onNotesFromOptions($event)">
          <ion-icon slot="start" :icon="bookOutline"></ion-icon>

          <ion-label>Notas</ion-label>
        </ion-item>

        <ion-item
          v-if="!isClosed"
          button
          lines="none"
          @click="onDeleteFromOptions($event)"
        >
          <ion-icon slot="start" :icon="trashOutline" color="danger"></ion-icon>

          <ion-label class="danger">Eliminar</ion-label>
        </ion-item>

        <ion-item v-if="isClosed" lines="none">
          <ion-label class="danger">Día cerrado</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
  <!-- end popovers -->

  <!-- alerts -->
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
  <!-- end alerts -->
</template>

<script setup lang="ts">
// Imports
import {
  IonCard,
  IonItem,
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
  trashOutline,
  ellipsisVerticalOutline,
  swapHorizontalOutline,
  walletOutline,
  businessOutline,
} from 'ionicons/icons';
import { reactive, computed } from 'vue';
import { useAccountsStore } from '@/stores/accountsStore';
// End Imports

// Components

// End Components

// Vars
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
  accountId?: number;
  estimated?: number;
  _supplierId?: string | number;
  _supplierName?: string;
}

type IonEvent = {
  detail?: { value?: string | number | string[] | null };
  target?: { value?: string | number | null };
};

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
  'open-edit-modal',
]);

const accountsStore = useAccountsStore();

const popovers = reactive({
  open: false,
  event: null as Event | null,
  provider: null as Provider | null,
});

const optionsPopover = reactive({
  open: false,
  event: null as Event | null,
  provider: null as Provider | null,
});

const deleteConfirm = reactive({
  open: false,
  providerId: null as string | number | null,
  providerName: '' as string,
  event: null as Event | null,
});
// End Vars

// Functions
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
    closeOptionsPopover();
    openDeleteConfirm(e);
  } catch (err) {
    console.error('onDeleteFromOptions error', err);
  }
}

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

function onMoveFromOptions(e: Event) {
  try {
    closeOptionsPopover();
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

function handleItemClick(e?: Event) {
  try {
    console.debug('ProviderCardComponent.handleItemClick - provider:', props.provider);
    // Emit the provider directly for simplicity
    emit('open-edit-modal', props.provider);
  } catch (err) {
    console.error('handleItemClick error', err);
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

  if (value == null) {
    return;
  }
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
// End Functions

// Life cycle

// End Life cycle

// Computed
const accountDisplay = computed(() => {
  const accountId = props.provider.accountId;
  if (!accountId) return '';

  const account = accountsStore.accounts.find(
    a => String(a.id) === String(accountId)
  );

  if (!account) return '';
  return account.name;
});
// End Computed

// Watch
// End Watch
</script>

<style scoped>
.provider-card {
  margin: 8px 10px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.provider-card.provider-just-added {
  animation: highlight 1s ease-out;
}

@keyframes highlight {
  0% {
    background-color: var(--ion-color-success-tint);
  }
  100% {
    background-color: transparent;
  }
}

.provider-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.provider-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.provider-icon {
  font-size: 24px;
  color: var(--ion-color-primary);
}

.provider-name {
  font-weight: 700;
  font-size: 18px;
  color: var(--ion-color-dark);
}

.provider-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 34px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-icon {
  font-size: 16px;
  color: var(--ion-color-medium);
}

.account-label {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 4px;
}

.total-label {
  font-size: 20px;
  font-weight: 600;
}

.options-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  --padding-start: 8px;
  --padding-end: 8px;
}
</style>
