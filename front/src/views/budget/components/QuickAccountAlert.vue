<template>
  <ion-alert
    :is-open="isOpen"
    header="Nueva Cuenta"
    :inputs="inputs"
    :buttons="buttons"
    @did-dismiss="$emit('didDismiss')"
  />
</template>

<script lang="ts" setup>
import { IonAlert } from '@ionic/vue';

defineProps<{
  isOpen: boolean;
  inputs: Array<{ name: string; type: string; placeholder: string; value?: unknown }>;
  buttons: Array<{ text: string; role?: any; cssClass?: any; handler?: any }>;
}>();

defineEmits<{
  didDismiss: [];
}>();
</script>
