<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/statistics/performance"></ion-back-button>
        </ion-buttons>
        <ion-title>Configuración de Performance</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <ion-card class="shadow1 ion-margin-top">
              <ion-item lines="full" class="transparent">
                <ion-label>Organizá tus categorías por sección</ion-label>
                <ion-button slot="end" fill="clear" @click="openSectionPicker()">
                  Editar
                </ion-button>
              </ion-item>
              <ion-card-content>
                <ion-note color="medium" class="ion-text-wrap">
                      La sección define en qué bloque del Income Statement va una categoría. Solo
                      cambia el orden de tus números en esa vista — tus datos quedan iguales.
                </ion-note>
              </ion-card-content>
            </ion-card>

          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>

    <SectionAssignModal
      :is-open="showAssignModal"
      :categories="allCategories"
      :sections="sections"
      :section-map="sectionMap"
      @confirm="onSectionConfirm"
      @created="onCategoriesReloadNeeded"
      @dismiss="closeSectionPicker"
    />
  </ion-page>
</template>

<script lang="ts" setup>
// Imports (ionic/vue/ionicons)
import {
  IonPage,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonItem,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonNote,
  IonBackButton,
} from '@ionic/vue';
import { ref, onMounted } from 'vue';

// Import utils
import { entryCategoriesDb } from '@/db/controllers/entryCategoriesDb';
import type { EntryCategoryRow, IncomeStatementSection, IncomeStatementSectionMap } from '@/db/types';
import SectionAssignModal from '@/components/SectionAssignModal.vue';
// end imports

// Vars
const allCategories = ref<EntryCategoryRow[]>([]);
const sectionMap = ref<IncomeStatementSectionMap>({
  incomes: [],
  costOfLife: [],
  discretionaryExpenses: [],
  financialExpenses: [],
});

const sections: Array<{ key: IncomeStatementSection; label: string }> = [
  { key: 'incomes', label: 'Ingresos' },
  { key: 'costOfLife', label: 'Costo de Vida' },
  { key: 'discretionaryExpenses', label: 'Gastos Discrecionales' },
  { key: 'financialExpenses', label: 'Gastos Financieros' },
];

const showAssignModal = ref(false);
// end vars

// OnMounted
onMounted(async () => {
  await entryCategoriesDb.ensureSeeded();
  allCategories.value = await entryCategoriesDb.getAll();
  sectionMap.value = await entryCategoriesDb.getSectionMap();
});
// end onmounted

// Functions
function openSectionPicker() {
  showAssignModal.value = true;
}

function closeSectionPicker() {
  showAssignModal.value = false;
}

async function onSectionConfirm(map: IncomeStatementSectionMap) {
  sectionMap.value = { ...map };
  await entryCategoriesDb.setSectionMap({ map: sectionMap.value });
  showAssignModal.value = false;
}

async function onCategoriesReloadNeeded() {
  allCategories.value = await entryCategoriesDb.getAll();
}


// end functions
</script>
