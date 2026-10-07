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
        <ion-title>{{ t('budget.components.pendingrecurringmodal.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card class="shadow1">
        <ion-list class="transparent">
          <template v-if="records.length > 0">
            <ion-item
              v-for="rec in records"
              :key="rec.sync_id ?? rec.id"
              lines="full"
              class="transparent"
            >
              <ion-label>
                <h2>{{ rec.name }}</h2>
                <p>{{ rec.type === 'cargo' ? t('common.charge') : t('common.provider') }} · {{ frequencyLabel({ record: rec }) }}</p>
                <p v-if="rec.amount" small>{{ formatCurrency({ value: rec.amount }) }}</p>
                <p v-else small>{{ t('budget.components.pendingrecurringmodal.variableAmount') }}</p>
                <p v-if="rec.autoInsert && rec.time" small>{{ t('budget.components.pendingrecurringmodal.autoInsertAt', { time: rec.time }) }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="primary" @click="emit('apply', { record: rec })">
                {{ t('common.apply') }}
              </ion-button>
            </ion-item>
          </template>

          <template v-else>
            <ion-item>
              <ion-label class="ion-text-center">{{ t('budget.components.pendingrecurringmodal.empty') }}</ion-label>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>

      <div v-if="records.length >= 2" class="ion-padding">
        <ion-button expand="block" color="primary" @click="emit('applyAll')">
          {{ t('budget.components.pendingrecurringmodal.applyAll', { count: records.length }) }}
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// 1. Imports (ionic/vue/ionicons)
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
import { useLocale } from '@/composables/useLocale';

// 2. Controllers / Composables
// (Locale composable imported above)

// 3. Components
// (none)

// 4. Interface and types imports
// (none — RecurringRecord imported above)

// 5. Main (props, emits, etc.)
// (none)

// 6. Vars and const
const props = defineProps<{
  isOpen: boolean;
  records: RecurringRecord[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', payload: { record: RecurringRecord }): void;
  (e: 'applyAll'): void;
}>();

const { t } = useLocale();
const weekDayShort = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const weekDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ordinalNames = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto', 'Séptimo', 'Octavo'];

// 7. Watch
// (none)

// 8. Computed
// (none)

// 9. OnMounted
// (none)

// 10. Functions (named parameters pattern)
function frequencyLabel(params: { record: RecurringRecord }) {
  const { record } = params;
  const interval = record.repeatInterval || 1;
  switch (record.repeatFrequency) {
    case 'day':
      return interval === 1
        ? t('recurring.frequency.daily')
        : t('recurring.frequency.days', { n: interval });
    case 'week': {
      const days = (record.repeatDays || [])
        .sort((a, b) => a - b)
        .map((d) => weekDayShort[d] || '')
        .filter(Boolean)
        .join(', ');
      const base = interval === 1
        ? t('recurring.frequency.weekly')
        : t('recurring.frequency.weeks', { n: interval });
      return days ? `${base} - ${days}` : base;
    }
    case 'month':
      if (record.repeatMonthWeekdayMode) {
        const ordinalIdx = record.repeatMonthWeekdayOrdinal ?? 1;
        const ordinal = ordinalIdx === -1
          ? t('recurring.frequency.last')
          : (ordinalNames[ordinalIdx] || t('recurring.frequency.first'));
        const weekday = weekDayNames[record.repeatMonthWeekday ?? 0] || '';
        return t('recurring.frequency.monthWeekday', { ordinal, weekday });
      }
      return t('recurring.frequency.monthDay', { day: record.repeatMonthDay || 1 });
    case 'year': {
      const m = monthNames[(record.repeatYearMonth || 1) - 1];
      const d = record.repeatYearDay || 1;
      return interval === 1
        ? t('recurring.frequency.yearly', { m, d })
        : t('recurring.frequency.years', { n: interval, m, d });
    }
    default:
      return '';
  }
}
</script>