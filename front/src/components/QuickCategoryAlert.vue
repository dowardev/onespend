<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-alert
    :is-open="isOpen"
    header="Nueva Categoría"
    sub-header="Elige la sección donde vivirá esta categoría"
    :inputs="inputs"
    :buttons="buttons"
    @did-dismiss="$emit('didDismiss')"
  />
</template>

<script lang="ts" setup>
import { IonAlert } from '@ionic/vue';

defineProps<{
  isOpen: boolean;
  inputs: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
}>();

defineEmits<{
  didDismiss: [];
}>();
</script>