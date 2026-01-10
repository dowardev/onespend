<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button :mode="designMode"></ion-menu-button>
        </ion-buttons>

        <ion-title>Presupuesto </ion-title>

        <ion-buttons slot="end">
          <ion-button @click="openMoreOptions($event)">
            <ion-icon :icon="ellipsisVerticalOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section class="ion-padding-top">
        <ion-item lines="none" class="transparent">
          <ion-buttons>
            <ion-segment
              v-model="activeView"
              scrollable
              :disabled="budgetController.getIsDayClosed()"
            >
              <ion-segment-button value="inicio">Inicio</ion-segment-button>
              <ion-segment-button value="proveedores"
                >Proveedores</ion-segment-button
              >
            </ion-segment>
          </ion-buttons>

          <ion-buttons slot="end">
            <ion-button
              title="Retroceder"
              :disabled="budgetController.getIsDayClosed()"
              @click="goBack"
            >
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </ion-button>

            <ion-button
              title="Seleccionar fecha"
              :disabled="budgetController.getIsDayClosed()"
              @click="openDatePicker($event)"
            >
              {{ formattedSelectedDate }}
            </ion-button>

            <ion-button
              title="Avanzar"
              :disabled="budgetController.getIsDayClosed()"
              @click="goForward"
            >
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </section>

      <section v-if="!budgetController.getIsDayClosed()">
        <ion-grid v-if="activeView === 'inicio'">
          <ion-row>
            <ion-col size="12">
              <InicioViewComponent />
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-grid v-if="activeView === 'proveedores'">
          <ion-row>
            <ion-col size="12">
              <ProvidersComponent />
            </ion-col>
          </ion-row>
        </ion-grid>
      </section>

      <section v-else>
        <ion-row>
          <ion-col size="12">
            <FinishDayForm :finish-day="finishDay" @save="saveFinishDay" />
          </ion-col>
        </ion-row>
      </section>

      <!-- popovers -->
      <ion-popover
        :is-open="showDatePicker"
        :event="datePickerEvent"
        :keep-contents-mounted="true"
        @did-dismiss="showDatePicker = false"
      >
        <ion-content class="centered-popover">
          <ion-datetime
            :value="budgetController.getSelectedDate()"
            presentation="date"
            @ion-change="onDateSelected"
          ></ion-datetime>
          <ion-item>
            <ion-button
              slot="end"
              fill="clear"
              color="primary"
              size="small"
              @click="goToToday"
            >
              Hoy
            </ion-button>
          </ion-item>
        </ion-content>
      </ion-popover>

      <ion-popover
        :is-open="showMoreOptions"
        :event="moreOptionsEvent"
        :keep-contents-mounted="true"
        :dismiss-on-select="true"
        @did-dismiss="showMoreOptions = false"
      >
        <ion-content>
          <ion-item lines="none" button>
            <ion-toggle
              :checked="!budgetController.getIsDayClosed()"
              enable-on-off-labels
              @ion-change="budgetController.toggleDayClosed(!$event.detail.checked)"
            >
              {{ budgetController.getIsDayClosed() ? 'Día cerrado' : 'Día abierto' }}
            </ion-toggle>
          </ion-item>
          <ion-item
            button
            :disabled="budgetController.getIsDayClosed()"
            @click="confirmClearDay"
          >
            <ion-icon
              slot="start"
              :icon="trashOutline"
              color="danger"
            ></ion-icon>
            <ion-label>Vaciar día</ion-label>
          </ion-item>
        </ion-content>
      </ion-popover>
      <!-- end popovers -->

      <!-- alerts -->
      <ion-alert
        :is-open="showClearConfirm"
        header="Vaciar día"
        message="¿Deseas eliminar todos los proveedores e ingresos de la fecha seleccionada?"
        :buttons="[
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => (showClearConfirm = false),
          },
          { text: 'Vaciar', cssClass: 'danger', handler: performClearDay },
        ]"
        @did-dismiss="showClearConfirm = false"
      ></ion-alert>
      <!-- end alerts -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonCol,
  IonContent,
  IonDatetime,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
  IonPopover,
  IonRow,
  IonTitle,
  IonToolbar,
  IonToggle,
  IonAlert,
} from '@ionic/vue';
import { computed, ref, onMounted } from 'vue';
import {
  chevronBackOutline,
  chevronForwardOutline,
  ellipsisVerticalOutline,
  trashOutline,
} from 'ionicons/icons';
import { format } from 'date-fns';
import { parseLocalDate, formatLocalDate } from '@/utils/date';
import { es as esLocale } from 'date-fns/locale';

import systemController from '@/controllers/systemConfigController';
import budgetController from '@/controllers/budgetController';
import InicioViewComponent from './InicioViewComponent.vue';
import ProvidersComponent from './ProvidersComponent.vue';
import FinishDayForm from './FinishDayForm.vue';

const activeView = ref<'inicio' | 'proveedores'>('inicio');
const showDatePicker = ref(false);
const showMoreOptions = ref(false);
const showClearConfirm = ref(false);
const datePickerEvent = ref<Event | null>(null);
const moreOptionsEvent = ref<Event | null>(null);
const designMode = computed(() => systemController.getDesignMode());

const finishDay = computed(() => budgetController.getFinishDayData());

function saveFinishDay() {
  budgetController.saveData();
  showMoreOptions.value = false;
}

const formattedSelectedDate = computed(() => {
  try {
    const d = parseLocalDate(budgetController.getSelectedDate());
    if (isNaN(d.getTime())) return budgetController.getSelectedDate();
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch {
    return budgetController.getSelectedDate();
  }
});

function openDatePicker(event: Event) {
  datePickerEvent.value = event;
  showDatePicker.value = true;
}

function openMoreOptions(event: Event) {
  moreOptionsEvent.value = event;
  showMoreOptions.value = true;
}

function onDateSelected(e: any) {
  const value = e?.detail?.value;
  if (value) {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    budgetController.setDate(`${y}-${m}-${day}`);
  }
  showDatePicker.value = false;
}

function goToToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  budgetController.setDate(`${y}-${m}-${day}`);
  showDatePicker.value = false;
}

function goBack() {
  const current = budgetController.getSelectedDate();
  const d = parseLocalDate(current);
  d.setDate(d.getDate() - 1);
  budgetController.setDate(formatLocalDate(d));
}

function goForward() {
  const current = budgetController.getSelectedDate();
  const d = parseLocalDate(current);
  d.setDate(d.getDate() + 1);
  budgetController.setDate(formatLocalDate(d));
}

function confirmClearDay() {
  showMoreOptions.value = false;
  showClearConfirm.value = true;
}

function performClearDay() {
  budgetController.clearDay();
  budgetController.saveData();
  showClearConfirm.value = false;
}

onMounted(async () => {
  await budgetController.loadDataForCurrentDate();
});
</script>
