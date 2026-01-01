<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar style="--background: white">
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

    <ion-content style="--background: white">
      <section>
        <ion-item lines="none" class="transparent">
          <ion-buttons>
            <ion-segment v-model="activeView" scrollable>
              <ion-segment-button value="inicio">Inicio</ion-segment-button>
              <ion-segment-button value="proveedores"
                >Proveedores</ion-segment-button
              >
            </ion-segment>
          </ion-buttons>

          <ion-buttons slot="end">
            <ion-button title="Retroceder" @click="goBack">
              <ion-icon :icon="chevronBackOutline"></ion-icon>
            </ion-button>

            <ion-button
              title="Seleccionar fecha"
              @click="openDatePicker($event)"
            >
              {{ formattedSelectedDate }}
            </ion-button>

            <ion-button title="Avanzar" @click="goForward">
              <ion-icon :icon="chevronForwardOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </section>

      <section v-if="!store.isDayClosed">
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

      <ion-popover
        :is-open="showDatePicker"
        :event="datePickerEvent"
        :keep-contents-mounted="true"
        @did-dismiss="showDatePicker = false"
      >
        <ion-content class="centered-popover">
          <ion-datetime
            :value="store.selectedDate"
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
              :checked="!store.isDayClosed"
              enable-on-off-labels
              @ion-change="store.toggleDayClosed(!$event.detail.checked)"
            >
              {{ store.isDayClosed ? 'Día cerrado' : 'Día abierto' }}
            </ion-toggle>
          </ion-item>
          <ion-item
            button
            @click="confirmClearDay"
            :disabled="!store.isDayClosed"
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
import { computed, ref, reactive } from 'vue';
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
import { useBudgetStore } from '@/stores/budgetStore';
import InicioViewComponent from './InicioViewComponent.vue';
import ProvidersComponent from './ProvidersComponent.vue';
import FinishDayForm from './FinishDayForm.vue';

const store = useBudgetStore();

const activeView = ref<'inicio' | 'proveedores'>('inicio');
const showDatePicker = ref(false);
const showMoreOptions = ref(false);
const showClearConfirm = ref(false);
const datePickerEvent = ref<Event | null>(null);
const moreOptionsEvent = ref<Event | null>(null);
const designMode = computed(() => systemController.getDesignMode());

const finishDay = reactive({
  totalSalesEfectivo: 0,
  totalSalesTarjeta: 0,
  totalSalesCredito: 0,
  type: '%',
  margin: 0,
});

function saveFinishDay() {
  console.log('Finish day saved:', finishDay);
  showMoreOptions.value = false;
}

const formattedSelectedDate = computed(() => {
  try {
    const d = parseLocalDate(store.selectedDate);
    if (isNaN(d.getTime())) return store.selectedDate;
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: esLocale });
  } catch {
    return store.selectedDate;
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
    store.setDate(`${y}-${m}-${day}`);
  }
  showDatePicker.value = false;
}

function goToToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  store.setDate(`${y}-${m}-${day}`);
  showDatePicker.value = false;
}

function goBack() {
  const current = store.selectedDate;
  const d = parseLocalDate(current);
  d.setDate(d.getDate() - 1);
  store.setDate(formatLocalDate(d));
}

function goForward() {
  const current = store.selectedDate;
  const d = parseLocalDate(current);
  d.setDate(d.getDate() + 1);
  store.setDate(formatLocalDate(d));
}

function confirmClearDay() {
  showMoreOptions.value = false;
  showClearConfirm.value = true;
}

function performClearDay() {
  store.clearDay();
  showClearConfirm.value = false;
}
</script>
