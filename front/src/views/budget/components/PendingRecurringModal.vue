<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-modal :is-open="isOpen" :keep-contents-mounted="true" @did-dismiss="emit('close')">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="emit('close')">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Cargos recurrentes pendientes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <template v-if="records.length > 0">
            <ion-item
              v-for="rec in records"
              :key="rec.id"
              lines="full"
              class="transparent"
            >
              <ion-label>
                <h2>{{ rec.name }}</h2>
                <p>{{ rec.type === 'cargo' ? 'Cargo' : 'Provedor' }} · {{ frequencyLabel({ record: rec }) }}</p>
                <p v-if="rec.amount" small>{{ formatCurrency({ value: rec.amount }) }}</p>
                <p v-else small>Monto variable</p>
                <p v-if="rec.autoInsert && rec.time" small>Auto‑inserción a las {{ rec.time }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="primary" @click="emit('apply', { record: rec })">
                Aplicar
              </ion-button>
            </ion-item>
          </template>

          <template v-else>
            <ion-item>
              <ion-label class="ion-text-center">Sin pendientes</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>

      <div v-if="records.length >= 2" class="ion-padding">
        <ion-button expand="block" color="primary" @click="emit('applyAll')">
          Aplicar todos ({{ records.length }})
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Imports
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonCard,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';
import { formatCurrency } from '@/utils/currency';
import type { RecurringRecord } from '@/controllers/recurringRecordsController';
// End Imports

// Components
// End Components

// Vars
const props = defineProps<{
  isOpen: boolean;
  records: RecurringRecord[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', payload: { record: RecurringRecord }): void;
  (e: 'applyAll'): void;
}>();
// End Vars

// Functions
const weekDayShort = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const weekDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ordinalNames = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo'];

function frequencyLabel(params: { record: RecurringRecord }) {
  const { record } = params;
  const interval = record.repeatInterval || 1;
  switch (record.repeatFrequency) {
    case 'day':
      return interval === 1 ? 'Cada día' : `Cada ${interval} días`;
    case 'week': {
      const days = (record.repeatDays || [])
        .sort((a, b) => a - b)
        .map((d) => weekDayShort[d] || '')
        .filter(Boolean)
        .join(', ');
      const base = interval === 1 ? 'Cada semana' : `Cada ${interval} semanas`;
      return days ? `${base} - ${days}` : base;
    }
    case 'month':
      if (record.repeatMonthWeekdayMode) {
        const ordinalIdx = record.repeatMonthWeekdayOrdinal ?? 1;
        const ordinal = ordinalIdx === -1 ? 'Último' : (ordinalNames[ordinalIdx] || 'Primer');
        const weekday = weekDayNames[record.repeatMonthWeekday ?? 0] || '';
        return `Cada mes - ${ordinal} ${weekday}`;
      }
      return `Cada mes - día ${record.repeatMonthDay || 1}`;
    case 'year': {
      const m = monthNames[(record.repeatYearMonth || 1) - 1];
      const d = record.repeatYearDay || 1;
      return interval === 1 ? `Cada año - ${m} ${d}` : `Cada ${interval} años - ${m} ${d}`;
    }
    default:
      return '';
  }
}
// End Functions
</script>
