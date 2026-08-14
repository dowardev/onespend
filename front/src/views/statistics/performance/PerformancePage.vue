<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Mis Finanzas</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="isExporting" aria-label="Exportar a Excel" @click="exportToExcel">
            <ion-icon :icon="downloadOutline"></ion-icon>
          </ion-button>

          <ion-button id="help-trigger" fill="clear" aria-label="Ayuda">
            <ion-icon :icon="helpCircleOutline" />
          </ion-button>

          <ion-button aria-label="Configuración" @click="openConfigModal">
            <ion-icon :icon="settingsOutline"></ion-icon>
          </ion-button>

          <ion-popover trigger="help-trigger" trigger-action="click" side="bottom" alignment="end">
            <ion-content class="ion-padding">
              <p class="ion-text-wrap" style="max-width: 280px">
                <strong>¿Cómo funciona?</strong><br /><br />
                Haz click en cualquier <strong>título de sección</strong> o
                <strong>concepto</strong> para ver su descripción y fórmula de cálculo.
              </p>
            </ion-content>
          </ion-popover>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-grid>
        <ion-row>
          <ion-col size="12" style="display: flex; justify-content: center">
            <ion-segment v-model="mainSegment" scrollable>
              <ion-segment-button value="day">Día</ion-segment-button>
              <ion-segment-button value="week">Semana</ion-segment-button>
              <ion-segment-button value="month">Mes</ion-segment-button>
              <ion-segment-button value="year">Año</ion-segment-button>
            </ion-segment>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="12" size-lg="8" size-xl="6">
            <PerformanceComponent ref="performanceComponentRef" :period="mainSegment" />
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-modal class="config-modal" :is-open="isConfigModalOpen" @did-dismiss="closeConfigModal">
        <PersonalFinanceConfigModal @close="closeConfigModal" @save="onConfigSave" />
      </ion-modal>

      <ion-loading :is-open="isExporting" message="Generando Excel..." />
    </ion-content>
  </ion-page>
</template>

<script lang="ts" setup>
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonSegment,
  IonSegmentButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
  IonLoading,
  IonPopover,
} from '@ionic/vue';
import { ref } from 'vue';
import { downloadOutline, settingsOutline, helpCircleOutline } from 'ionicons/icons';
import { StatisticsController } from '@/controllers/statisticsController';
import type { IncomeStatementResult } from '@/composables/useIncomeStatement';

import PerformanceComponent from '@/views/statistics/performance/components/PerformanceComponent.vue';
import PersonalFinanceConfigModal from '@/views/statistics/performance/components/PersonalFinanceConfigModal.vue';

const statisticsController = new StatisticsController();

const mainSegment = ref('day' as 'day' | 'week' | 'month' | 'year');
const isConfigModalOpen = ref(false);
const isExporting = ref(false);
const performanceComponentRef = ref<any>(null);

function openConfigModal() {
  isConfigModalOpen.value = true;
}

function closeConfigModal() {
  isConfigModalOpen.value = false;
}

async function onConfigSave() {
  isConfigModalOpen.value = false;
  await performanceComponentRef.value?.refresh();
}

async function exportToExcel() {
  if (isExporting.value) return;
  isExporting.value = true;

  const instance = performanceComponentRef.value;
  if (!instance) {
    isExporting.value = false;
    return;
  }

  const stmt = instance.statement?.value as IncomeStatementResult | undefined;
  if (!stmt) {
    isExporting.value = false;
    return;
  }

  function mapItems(items: Array<{ name: string; amount: number }>): Record<string, number> {
    return Object.fromEntries(items.map((i) => [i.name, i.amount]));
  }

  const incomeMap = mapItems(stmt.incomes.items);
  const costMap = mapItems(stmt.costOfLife.items);
  const discMap = mapItems(stmt.discretionaryExpenses.items);
  const finMap = mapItems(stmt.financialExpenses.items);

  const label =
    typeof instance.dateLabel === 'object' && 'value' in instance.dateLabel
      ? (instance.dateLabel as { value: string }).value
      : String(instance.dateLabel ?? '');

  try {
    await statisticsController.downloadExcel({
      period: mainSegment.value,
      dateLabel: label,
      incomeData: {
        salary: incomeMap['Salario'] ?? 0,
        investments: incomeMap['Inversiones'] ?? 0,
        other: incomeMap['Otros ingresos'] ?? 0,
        total: stmt.incomes.total,
      },
      expensesData: {
        housing: costMap['Vivienda'] ?? 0,
        food: costMap['Alimentación'] ?? 0,
        transport: costMap['Transporte'] ?? 0,
        entertainment: discMap['Entretenimiento'] ?? 0,
        health: costMap['Salud'] ?? 0,
        other: (discMap['Otros'] ?? 0) + Object.values(finMap).reduce((a, b) => a + b, 0),
        total:
          stmt.costOfLife.total + stmt.discretionaryExpenses.total + stmt.financialExpenses.total,
      },
      summaryData: {
        balance: stmt.netResult,
        savings: stmt.netResult,
        savingsPercentage: stmt.netResultPercent,
      },
      configData: {
        savingsPercent: 20,
      },
      filenameFactory: () => `reporte_${mainSegment.value}_${label}.xlsx`,
    });
  } catch (error) {
    console.error('[PerformancePage] Excel error:', error);
  } finally {
    isExporting.value = false;
  }
}
</script>

<style scoped>
@media (min-width: 768px) {
  .config-modal {
    --height: 90%;
    --max-height: 700px;
    --max-width: 500px;
    --min-height: 400px;
    --min-width: 300px;
    --width: 90%;
  }
}
</style>
