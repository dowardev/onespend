<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-alert
    :is-open="isOpen"
    :header="t('quickcategoryalert.text')"
    :sub-header="t('quickcategoryalert.subHeader')"
    :inputs="inputs"
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
  inputs: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
}>();

defineEmits<{
  didDismiss: [];
}>();
</script>