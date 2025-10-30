<template>
  <ion-page>
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-title>Templates</ion-title>

        <ion-buttons slot="end">
          <ion-button @click="showModal = true">
            <ion-icon :icon="createOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>Templates</ion-label>
        </ion-list-header>

        <div class="content" v-if="templates.length">
          <ion-item
            v-for="t in templates"
            :key="t.id"
            lines="full"
            class="transparent"
          >
            <ion-label>
              <h2>{{ t.name }}</h2>
              <p>{{ t.description }}</p>
            </ion-label>

            <ion-button
              class="no-shadow"
              slot="end"
              size="small"
              @click="applyTemplate({ t })"
            >
              <ion-icon :icon="checkmarkOutline"></ion-icon>
            </ion-button>

            <ion-button
              slot="end"
              size="small"
              fill="clear"
              @click="applyTemplate({ t })"
            >
              <ion-icon :icon="createOutline"></ion-icon>
            </ion-button>

            <ion-button
              slot="end"
              size="small"
              color="danger"
              fill="clear"
              @click="applyTemplate({ t })"
            >
              <ion-icon :icon="trashOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </div>

        <template v-else>
          <ion-item lines="none" class="transparent">
            <ion-label>No hay templates aún</ion-label>
          </ion-item>
        </template>
      </ion-list>

      <!-- modals -->
      <ion-modal v-model:is-open="showModal">
        <ion-header class="ion-no-border" mode="ios">
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button fill="clear" @click="showModal = false">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>

            <ion-title>Nuevo template</ion-title>

            <ion-buttons slot="end">
              <ion-button @click="submitTemplate()">
                <ion-icon :icon="saveOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-card class="shadow1 ion-padding-start">
            <ion-input
              label="Nombre del template"
              label-placement="floating"
              v-model="form.name"
              placeholder="Ej: Día base"
            ></ion-input>
          </ion-card>

          <ion-list class="transparent">
            <ion-list-header>
              <ion-label>Proveedores</ion-label>

              <ion-button @click="addProvider">
                <ion-icon :icon="addOutline"></ion-icon>
              </ion-button>
            </ion-list-header>

            <div class="content">
              <ion-item
                v-for="(p, idx) in form.providers"
                :key="idx"
                class="transparent"
              >
                <ion-input
                  v-model="form.providers[idx]"
                  placeholder="Nombre del proveedor"
                ></ion-input>
                <ion-button
                  slot="end"
                  fill="clear"
                  size="small"
                  @click="removeProvider(idx)"
                  title="Eliminar proveedor"
                >
                  <ion-icon color="danger" :icon="trashOutline"></ion-icon>
                </ion-button>
              </ion-item>
            </div>
          </ion-list>
        </ion-content>
      </ion-modal>
      <!-- end modals -->

      <!-- alerts -->
      <ion-alert
        v-model:is-open="showAlert"
        header="Atención"
        :message="alertMessage"
        :buttons="['OK']"
      ></ion-alert>
      <!-- end alerts -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonButton,
  IonModal,
  IonInput,
  IonAlert,
  IonIcon,
} from "@ionic/vue";
import {
  createOutline,
  addOutline,
  closeOutline,
  trashOutline,
  saveOutline,
  checkmarkOutline,
} from "ionicons/icons";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

// interface
type TemplateSummary = {
  id: string | number;
  name: string;
  description?: string;
};
// end interface

// main
const router = useRouter();
// end main

// vars
const templates = reactive<TemplateSummary[]>([
  {
    id: 1,
    name: "Día base",
    description: "Estructura inicial de proveedores e ingresos",
  },
  {
    id: 2,
    name: "Día con visita",
    description: "Marcado para visitas y estimaciones típicas",
  },
]);
const showModal = ref(false);
const showAlert = ref(false);
const alertMessage = ref("");
const form = reactive({
  name: "",
  providers: [""],
});
// end vars

// functions
function addProvider() {
  form.providers.push("");
}

function removeProvider(idx: number) {
  if (form.providers.length > 1) form.providers.splice(idx, 1);
}

function resetForm() {
  form.name = "";
  form.providers.splice(0, form.providers.length, "");
}

function submitTemplate() {
  if (!form.name.trim()) {
    alertMessage.value = "Por favor ingresa el nombre del template";
    showAlert.value = true;
    return;
  }

  const cleanedProviders = form.providers.map((p) => p.trim()).filter((p) => p);

  // Creamos un template simple; descripción puede contener los proveedores
  const newTemplate: TemplateSummary = {
    id: Date.now(),
    name: form.name.trim(),
    description: cleanedProviders.length
      ? `Proveedores: ${cleanedProviders.join(", ")}`
      : undefined,
  };

  templates.push(newTemplate);
  resetForm();
  showModal.value = false;
}

function applyTemplate(params: { t: TemplateSummary }) {
  const { t } = params;
  router.push({ name: "Budget", query: { template: String(t.id) } });
}
</script>
