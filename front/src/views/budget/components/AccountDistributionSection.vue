<template>
  <ion-list class="transparent">
    <ion-list-header>
      <ion-label>
        {{ headerLabel }}
        <p v-if="headerSubtitle" class="ion-note" style="margin-top: 4px; opacity: 0.7">
          {{ headerSubtitle }}
        </p>
      </ion-label>
      <ion-button :disabled="!canAddMore || isDayClosed" @click="$emit('addItem')">
        <ion-icon :icon="addOutline" />
      </ion-button>
    </ion-list-header>

    <template v-for="(item, displayIndex) in displayItems" :key="displayIndex">
      <ion-card class="shadow1">
        <div v-if="items.length > 1" style="display: flex; justify-content: flex-end">
          <ion-button
            fill="clear"
            size="small"
            :disabled="isDayClosed"
            @click="$emit('removeItem', { index: realIndex(displayIndex) })"
          >
            <ion-icon :icon="closeOutline" color="danger" />
          </ion-button>
        </div>

        <slot name="accountSelect" :index="realIndex(displayIndex)" :item="items[realIndex(displayIndex)]" />

        <ion-item lines="full" class="transparent">
          <ion-input
            :model-value="items[realIndex(displayIndex)].amount"
            label="Cantidad"
            label-placement="floating"
            type="number"
            placeholder="0"
            :class="{
              'ion-invalid': isAmountInvalid({ value: items[realIndex(displayIndex)].amount }),
              'ion-touched': isAmountTouched({ value: items[realIndex(displayIndex)].amount }),
            }"
            :error-text="getAmountError({ value: items[realIndex(displayIndex)].amount })"
            @update:model-value="$emit('updateItemAmount', { index: realIndex(displayIndex), amount: $event })"
          />
        </ion-item>
      </ion-card>
    </template>
  </ion-list>
</template>

<script lang="ts" setup>
import {
  IonList,
  IonListHeader,
  IonLabel,
  IonButton,
  IonIcon,
  IonCard,
  IonItem,
  IonInput,
} from '@ionic/vue';
import { addOutline, closeOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { isAmountInvalid, isAmountTouched, getAmountError } from '@/utils/amountValidation';

export interface DistributionItem {
  amount: number | string;
  accountId: string | number | { id: string | number } | null;
}

const props = defineProps<{
  items: DistributionItem[];
  headerLabel: string;
  headerSubtitle?: string;
  canAddMore: boolean;
  isDayClosed?: boolean;
  reverseOrder?: boolean;
}>();

defineEmits<{
  addItem: [];
  removeItem: [params: { index: number }];
  updateItemAmount: [params: { index: number; amount: string }];
}>();

const displayItems = computed(() => {
  return props.reverseOrder ? [...props.items].reverse() : props.items;
});

function realIndex(displayIndex: number): number {
  if (props.reverseOrder) {
    return props.items.length - 1 - displayIndex;
  }
  return displayIndex;
}
</script>
