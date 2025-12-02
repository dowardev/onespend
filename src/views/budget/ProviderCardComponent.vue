<template>
  <ion-card
    class="ion-padding-bottom"
    :class="['shadow2', { 'provider-just-added': props.provider._justAdded }]"
  >
    <ion-item lines="none" class="transparent">
      <ion-checkbox
        slot="start"
        :checked="props.provider.visited"
        @ion-change="
          (e: any) =>
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
            (e: any) =>
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
              id: provider.id,
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
        :color="props.isPaymentPrimary(props.provider) ? 'primary' : undefined"
      >
        {{ props.formatCurrency({ v: props.valueToConsider(props.provider) }) }}
      </ion-label>
    </div>

    <ion-item lines="none">
      <ion-button
        v-if="hasProductsFor && hasProductsFor(provider)"
        slot="end"
        fill="clear"
        size="small"
        title="Ver productos"
        class="icon-btn"
        @click.stop="emit('open-products-popover', { provider, event: $event })"
      >
        <ion-icon :icon="listOutline"></ion-icon>
      </ion-button>

      <ion-button
        slot="end"
        fill="clear"
        @click.stop="
          (e: any) => emit('open-notes-modal', { provider, event: e })
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
          (e: any) =>
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
} from '@ionic/vue';
import {
  listOutline,
  bookOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { type ComponentPublicInstance } from 'vue';

// interface
type FocusableRef =
  | Element
  | ComponentPublicInstance
  | {
      setFocus?: () => void;
      $el?: { setFocus?: () => void };
      focus?: () => void;
    };
// end inteface

// main
const props = defineProps<{
  provider: any;
  nameInputRefs: Record<string | number, FocusableRef | null>;
  hasProductsFor?: (params: { provider?: any } | any) => boolean;
  isPaymentPrimary: (p: any) => boolean;
  valueToConsider: (p: any) => number;
  formatCurrency: (params: { v: number }) => string;
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
]);
// end main
</script>

<style scoped>
.icon-btn {
  color: var(--ion-color-danger, #d9534f);
}
</style>
