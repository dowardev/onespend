<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<ion-popover
  :is-open="popoverState.open"
  :event="popoverState.event"
  keep-contents-mounted
  style="--width: 350px"
  @did-dismiss="$emit('didDismiss')"
>
    <ion-content class="ion-padding">
    <ion-datetime
      :model-value="tempPickerDateISO"
      presentation="date"
      style="background: transparent; width: 100%"
      @update:model-value="$emit('update:tempPickerDateISO', $event)"
    />
      <ion-item>
        <ion-button slot="start" fill="clear" size="small" @click="$emit('cancel')">
          Cancelar
        </ion-button>
        <ion-button
          slot="end"
          size="small"
          color="primary"
          :disabled="!canApply"
          @click="$emit('apply')"
        >
          Aplicar
        </ion-button>
      </ion-item>
    </ion-content>
  </ion-popover>
</template>

<script lang="ts" setup>
import { IonPopover, IonContent, IonDatetime, IonItem, IonButton } from '@ionic/vue';

defineProps({
  popoverState: { type: Object, default: () => ({ open: false, event: null }) },
  tempPickerDateISO: { type: String, default: null },
  canApply: { type: Boolean, default: false },
});

defineEmits<{
  didDismiss: [];
  cancel: [];
  apply: [];
  'update:tempPickerDateISO': [value: string | null];
}>();
</script>
