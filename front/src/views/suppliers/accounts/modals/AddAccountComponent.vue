<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="cancelModal">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>{{
          selectedId ? 'Editar Cuenta' : 'Crear Cuenta'
        }}</ion-title>

        <ion-buttons slot="end">
          <ion-button v-if="selectedId" color="danger" @click="confirmRemove">
            <ion-icon :icon="trashOutline"></ion-icon>
          </ion-button>
          <ion-button :disabled="!isFormValid" @click="onSubmit">
            <ion-icon :icon="saveOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-top ion-padding-bottom">
      <ion-card class="shadow1">
        <ion-item class="transparent" lines="none">
          <ion-input
            v-model="form.name"
            label="Nombre"
            label-placement="floating"
            required
          ></ion-input>
        </ion-item>

        <ion-item class="transparent" lines="none">
          <ion-input
            v-model.number="form.initialBalance"
            label="Balance inicial"
            label-placement="floating"
            type="number"
          ></ion-input>
        </ion-item>
      </ion-card>
    </ion-content>

    <ion-alert
      :is-open="showDeleteAlert"
      message="¿Eliminar esta cuenta?"
      :buttons="alertButtons"
      @did-dismiss="showDeleteAlert = false"
    ></ion-alert>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonInput,
  IonAlert,
} from '@ionic/vue';
import { reactive, computed, watch, ref } from 'vue';
import { closeOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { required, minValue, helpers } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';

const props = defineProps<{ account: any | null }>();
const emit = defineEmits<{
  (e: 'dismiss'): void;
  (e: 'saved', payload: any): void;
  (e: 'delete', id: string | number): void;
}>();

function confirmRemove() {
  if (selectedId.value != null) {
    emit('delete', selectedId.value);
  }
}

const form = reactive({ name: '', initialBalance: 0 });
const selectedId = computed(() => props.account?.id ?? null);
const showDeleteAlert = ref(false);

const formRules = computed(() => ({
  name: { required: helpers.withMessage('El nombre es obligatorio', required) },
  initialBalance: { minValue: minValue(0) },
}));

const v$ = useVuelidate(formRules, form);

const isFormValid = computed(() => {
  return !v$.value.$invalid;
});
const alertButtons = [
  { text: 'Cancelar', role: 'cancel' },
  {
    text: 'Eliminar',
    role: 'destructive',
    handler: () => {
      if (selectedId.value != null) emit('delete', selectedId.value);
    },
  },
];

watch(
  () => props.account,
  a => {
    if (a) {
      form.name = a.name || '';
      form.initialBalance = a.initialBalance ?? 0;
    } else {
      form.name = '';
      form.initialBalance = 0;
    }
  },
  { immediate: true }
);

function cancelModal() {
  emit('dismiss');
}

async function onSubmit() {
  const isValid = await v$.value.$validate();
  if (!isValid) return;

  const payload: any = {
    name: form.name,
    initialBalance: form.initialBalance,
  };
  if (selectedId.value != null) payload.id = selectedId.value;
  if (props.account?.sync_id) payload.sync_id = props.account.sync_id;

  emit('saved', payload);
}
</script>

<style scoped></style>
