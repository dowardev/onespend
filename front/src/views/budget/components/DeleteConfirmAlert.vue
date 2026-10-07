<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-alert
    :is-open="isOpen"
    :header="t('budget.components.deleteconfirmalert.text')"
    :message="message"
    :buttons="buttons"
    @did-dismiss="$emit('didDismiss')"
  />
</template>

<script lang="ts" setup>
import { IonAlert } from '@ionic/vue';
import { useLocale } from '@/composables/useLocale';


const { t } = useLocale();
defineProps<{
  isOpen: boolean;
  message: string;
  buttons: Array<{ text: string; role?: any; cssClass?: any; handler?: any }>;
}>();

defineEmits<{
  didDismiss: [];
}>();
</script>
