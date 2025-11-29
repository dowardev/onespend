<template>
  <ion-card
    class="ion-padding-bottom"
    :class="['shadow2', { 'provider-just-added': provider._justAdded }]"
  >
    <ion-item lines="none" class="transparent">
      <ion-checkbox
        slot="start"
        :checked="provider.visited"
        @ion-change="e => onVisitedChanged({ provider, event: e })"
      ></ion-checkbox>

      <div style="width: 100%" @click="startEditing({ provider })">
        <ion-label v-if="provider.name && !provider._editing">{{
          provider.name
        }}</ion-label>

        <ion-input
          v-show="provider._editing || !provider.name"
          :ref="el => emit('register-name-input', { id: provider.id, el })"
          :value="provider.name"
          :placeholder="provider._dbName || 'Nombre proveedor'"
          @ion-input="
            e =>
              emit('update-provider', {
                id: provider.id,
                field: 'name',
                value: e?.detail?.value ?? e?.target?.value ?? '',
              })
          "
          @ion-blur="stopEditing({ provider })"
        ></ion-input>
      </div>
    </ion-item>

    <div
      style="display: flex; justify-content: space-between"
      class="ion-padding-start ion-padding-end"
    >
      <ion-input
        :value="provider.efectivo"
        label="Efectivo"
        label-placement="floating"
        type="number"
        class="num-input small"
        @ion-input="
          e =>
            emit('update-provider', {
              id: provider.id,
              field: 'efectivo',
              value: Number(e?.detail?.value ?? e?.target?.value ?? 0),
            })
        "
      ></ion-input>

      <ion-input
        :value="provider.tarjeta"
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
        :value="provider.credito"
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
        :color="isPaymentPrimary(provider) ? 'primary' : undefined"
        @click="openPaymentPopover"
      >
        {{ formatCurrency({ v: valueToConsider(provider) }) }}
      </ion-label>
    </div>

    <ion-item lines="none">
      <ion-button
        v-if="hasProductsFor(provider)"
        slot="end"
        fill="clear"
        size="small"
        title="Ver productos"
        class="icon-btn"
        @click.stop="openProductsPopover({ provider, event: $event })"
      >
        <ion-icon :icon="listOutline"></ion-icon>
      </ion-button>

      <ion-button
        slot="end"
        fill="clear"
        @click.stop="openNotesModal({ provider })"
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
        @click.stop="confirmRemoveProveedor(provider.id, provider.name)"
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
defineProps<{
  provider: any;
  nameInputRefs: Record<string | number, FocusableRef | null>;
  // Accept either positional args (p, e) or a single params object { provider, event }
  onVisitedChanged: (params: { provider?: any; event?: any } | any) => void;
  // Accept either a provider param or an object { provider }
  startEditing: (params: { provider?: any } | any) => void;
  stopEditing: (params: { provider?: any } | any) => void;
  hasProductsFor: (params: { provider?: any } | any) => boolean;
  // openProductsPopover already used with an object: keep compatible
  openProductsPopover: (params: { provider: any; event: any } | any) => void;
  openNotesModal: (params: { provider?: any } | any) => void;
  confirmRemoveProveedor: (id: string | number, name?: string) => void;
  isPaymentPrimary: (p: any) => boolean;
  valueToConsider: (p: any) => number;
  formatCurrency: (params: { v: number }) => string;
}>();

const emit = defineEmits([
  'update-provider',
  'register-name-input',
  'update-visited',
]);
// end maing

// function
function openPaymentPopover() {
  // noop placeholder so the label click doesn't error if parent doesn't provide a popover
  // parent components can override by handling the click via the label if needed
  return;
}
</script>
<!-- end function -->

<style scoped>
.icon-btn {
  color: var(--ion-color-danger, #d9534f);
}
</style>
