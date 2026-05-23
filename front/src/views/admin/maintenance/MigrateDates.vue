<template>
  <ion-page class="migrate-dates admin-page">
    <ion-header class="ion-no-border" mode="ios">
      <ion-toolbar>
        <ion-buttons>
          <ion-button @click="$router.back()">
            <ion-icon :icon="arrowBackOutline"> </ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Migración de Fechas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col class="col" size="6">
            <p>
              Esta herramienta normaliza las fechas en las copias de seguridad a formato
              <code>YYYY-MM-DD</code>.
            </p>

            <div class="stepper">
              <div
                v-for="(s, i) in steps"
                :key="i"
                class="step"
                :class="{
                  active: stepIndex === i,
                  done: stepStatus[i] === 'done',
                }"
              >
                <div class="marker">{{ markerLabel({ i }) }}</div>
                <div class="info">
                  <div class="title">{{ s.title }}</div>
                  <div class="desc">{{ s.desc }}</div>
                </div>
              </div>
            </div>

            <div class="actions">
              <ion-button fill="outline" :disabled="stepIndex === 0 || running" @click="prevStep"
                >Atrás</ion-button
              >

              <ion-button
                color="primary"
                :disabled="
                  running ||
                  (stepIndex === 3 && !hasChanges) ||
                  (stepIndex === 2 && !hasChanges) ||
                  (stepIndex === 3 && !backupConfirmed)
                "
                @click="primaryAction"
                >{{ primaryLabel }}</ion-button
              >

              <template v-if="stepIndex === 3">
                <ion-item lines="none">
                  <ion-label>Confirmo que he descargado la copia de seguridad</ion-label>
                  <ion-checkbox slot="end" v-model="backupConfirmed" />
                </ion-item>
              </template>

              <ion-button fill="clear" :disabled="running" @click="resetAll">Reiniciar</ion-button>

              <ion-button
                v-if="isDev"
                fill="clear"
                color="tertiary"
                :disabled="running"
                @click="insertTestEntries"
              >
                Insertar datos de prueba
              </ion-button>
            </div>

            <!-- Inline confirmation fallback if ion-alert handlers don't run -->
            <div
              v-if="confirmAlert.open"
              class="inline-confirm"
              style="padding: 16px; border: 1px solid #eee; margin: 12px 0; border-radius: 8px"
            >
              <p>{{ confirmAlert.message }}</p>
              <div style="display: flex; gap: 8px; margin-top: 8px">
                <ion-button fill="outline" @click="confirmCancel">Cancelar</ion-button>
                <ion-button
                  color="danger"
                  @click="
                    () => {
                      confirmAlert.open = false;
                      doApplyMigration();
                    }
                  "
                  >Aplicar</ion-button
                >
              </div>
            </div>

            <div class="status-area">
              <div v-if="running" class="status">Ejecutando... {{ progressText }}</div>
              <div v-if="error" class="error">Error: {{ error }}</div>

              <div v-if="dryRunResult">
                <h3>Resultado de la simulación</h3>
                <p>
                  Total entradas inspeccionadas:
                  <strong>{{ dryRunResult.length }}</strong>
                </p>
                <p>
                  Entradas que cambiarían: <strong>{{ changedCount }}</strong>
                </p>
              </div>

              <div v-if="applyResult">
                <h3>Resultado de la aplicación</h3>
                <p>
                  Entradas actualizadas:
                  <strong>{{ applyChangedCount }}</strong>
                </p>
              </div>

              <div v-if="sampleResults.length">
                <h4>Ejemplos (antes → después)</h4>
                <ul>
                  <li v-for="(r, idx) in sampleResults" :key="idx">
                    <strong>ID:</strong> <code>{{ r.id }}</code>
                    <pre>{{ previewPair({ before: r.before, after: r.after }) }}</pre>
                  </li>
                </ul>
              </div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-toast
        :is-open="successToast.open"
        :message="successToast.message"
        :duration="2000"
        @did-dismiss="onSuccessToastDidDismiss"
      ></ion-toast>

      <ion-alert
        :is-open="confirmAlert.open"
        header="Confirmar migración"
        :message="confirmAlert.message"
        :buttons="confirmButtons"
        @did-dismiss="onAlertDidDismiss({ ev: $event })"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Imports
import { ref, computed, onMounted, reactive } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonToast,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonAlert,
} from '@ionic/vue';
import migrateNormalizeBackupDates from '@/migrations/normalizeBackupsDates';
import { useRoute } from 'vue-router';
import { arrowBackOutline } from 'ionicons/icons';
// End Imports

// Controllers
import dixieController from '@/controllers/dixie';
// End Controllers

// Vars
const steps = [
  {
    title: 'Exportar copia de seguridad',
    desc: 'Guarda un JSON de respaldo antes de cualquier cambio.',
  },
  {
    title: 'Simular migración (dry-run)',
    desc: 'Ver qué entradas cambiarían sin modificar nada.',
  },
  {
    title: 'Revisar resultados',
    desc: 'Revisar ejemplos y confirmar que todo está correcto.',
  },
  {
    title: 'Aplicar migración',
    desc: 'Actualizar las copias de seguridad en la base de datos.',
  },
];

const stepIndex = ref(0);
const stepStatus = ref<string[]>(['pending', 'pending', 'pending', 'pending']);
const running = ref(false);
const progressText = ref('');
const error = ref<string | null>(null);
interface MigrationResult {
  id: string | number;
  changed: boolean;
  before?: unknown;
  after?: unknown;
}

const dryRunResult = ref<MigrationResult[] | null>(null);
const applyResult = ref<MigrationResult[] | null>(null);

const successToast = reactive({ open: false, message: '' });
const backupConfirmed = ref(false);
const confirmAlert = reactive({
  open: false,
  message:
    '¿Seguro que quieres aplicar la migración? Asegúrate de haber exportado una copia de seguridad.',
});

const isDev = !!import.meta.env?.DEV;

// End Vars

// Functions
function markerLabel(params: { i: number }) {
  const { i } = params;
  if (stepStatus.value[i] === 'done') return '✓';
  return String(i + 1);
}

function previewPair(params: { before: unknown; after: unknown }) {
  const { before, after } = params;
  try {
    return JSON.stringify({ before, after }, null, 2);
  } catch {
    return String(before) + ' -> ' + String(after);
  }
}

async function exportBackups() {
  try {
    running.value = true;
    progressText.value = 'Obteniendo copias...';
    const all = await dixieController.listBackups();
    const blob = new Blob([JSON.stringify(all, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backups-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    stepStatus.value[0] = 'done';
    stepIndex.value = 1;
  } catch (e) {
    console.error(e);
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
    progressText.value = '';
  }
}

async function runDryRun() {
  try {
    running.value = true;
    error.value = null;
    progressText.value = 'Simulando...';
    const res = await migrateNormalizeBackupDates({
      dryRun: true,
      verbose: false,
    });
    dryRunResult.value = res as MigrationResult[];
    stepStatus.value[1] = 'done';
    stepIndex.value = 2;
  } catch (e) {
    console.error(e);
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
    progressText.value = '';
  }
}

interface BackupEntry {
  meta: Record<string, unknown>;
  data: Record<string, unknown>;
}

async function insertTestEntries() {
  try {
    running.value = true;
    progressText.value = 'Insertando entradas de prueba...';
    const bulk: BackupEntry[] = [];
    for (let i = 0; i < 50; i++) {
      if (i % 3 === 0) {
        bulk.push({
          meta: {},
          data: {
            selectedDate: `2027-04-${((i % 28) + 1).toString().padStart(2, '0')}T0${(i % 9) + 1}:00:00Z`,
          },
        });
      } else if (i % 3 === 1) {
        bulk.push({
          meta: {},
          data: {
            proveedores: [
              {
                id: `p-man-${i}`,
                name: `Prov man ${i}`,
                date: `2027-05-${((i % 27) + 1).toString().padStart(2, '0')}T12:34:56+02:00`,
              },
            ],
          },
        });
      } else {
        bulk.push({
          meta: {},
          data: {
            newIngreso: {
              id: `new-i-man-${i}`,
              date: `2027-06-${((i % 28) + 1).toString().padStart(2, '0')}T23:59:59Z`,
            },
          },
        });
      }
    }
    for (const e of bulk) {
      await dixieController.addEntry({ entry: e });
    }
    successToast.message = `Insertadas ${bulk.length} entradas de prueba.`;
    successToast.open = true;
  } catch (e) {
    console.error('insertTestEntries failed', e);
    error.value = 'No se pudieron insertar entradas de prueba';
  } finally {
    running.value = false;
    progressText.value = '';
  }
}

const confirmButtons = [
  {
    text: 'Cancelar',
    role: 'cancel',
    handler: () => {
      confirmAlert.open = false;
    },
  },
  {
    text: 'Aplicar',
    role: 'confirm',
    handler: async () => {
      try {
        if (import.meta.env?.DEV) {
          console.log('confirmButtons: Aplicar clicked');
        }
        confirmAlert.open = false;
        await doApplyMigration();
        if (import.meta.env?.DEV) {
          console.log('confirmButtons: doApplyMigration completed');
        }
      } catch (err) {
        console.error('confirmButtons handler error', err);
        error.value = (err && (err as Error).message) || String(err);
      }
    },
  },
];

function onConfirmAlertDidDismiss(params: { event: CustomEvent }) {
  const { event } = params;
  try {
    const role = event?.detail?.role ?? null;
    if (role === 'confirm') {
      void doApplyMigration();
    }
  } catch {
    console.warn('onConfirmAlertDidDismiss: error ignorado');
  } finally {
    confirmAlert.open = false;
  }
}

function onAlertDidDismiss(params: { event: CustomEvent }) {
  const { event } = params;
  try {
    const role = event?.detail?.role ?? null;
    if (import.meta.env?.DEV) {
      console.log('ion-alert did-dismiss, role=', role);
    }
    if (role === 'confirm') {
      if (import.meta.env?.DEV) {
        console.log('onAlertDidDismiss: triggering doApplyMigration');
      }
      void doApplyMigration();
    }
  } catch (err) {
    console.error('onAlertDidDismiss error', err);
  } finally {
    confirmAlert.open = false;
  }
}

function confirmCancel() {
  confirmAlert.open = false;
}

async function applyMigration() {
  confirmAlert.open = true;
}

async function doApplyMigration() {
  try {
    running.value = true;
    error.value = null;
    progressText.value = 'Aplicando migración...';
    const res = await migrateNormalizeBackupDates({
      dryRun: false,
      verbose: true,
    });
    applyResult.value = res as MigrationResult[];
    stepStatus.value[3] = 'done';
    stepIndex.value = 3;

    try {
      successToast.message = `Migración completada: ${applyChangedCount.value} entradas actualizadas.`;
      successToast.open = true;
    } catch (_e) {}
  } catch (e) {
    console.error(e);
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
    progressText.value = '';
  }
}

function prevStep() {
  if (stepIndex.value > 0) stepIndex.value -= 1;
}

function onSuccessToastDidDismiss() {
  try {
    resetAll();
  } finally {
    successToast.open = false;
  }
}

function resetAll() {
  stepIndex.value = 0;
  stepStatus.value = ['pending', 'pending', 'pending', 'pending'];
  dryRunResult.value = null;
  applyResult.value = null;
  error.value = null;
}

async function primaryAction() {
  switch (stepIndex.value) {
    case 0:
      return exportBackups();
    case 1:
      return runDryRun();
    case 2:
      if (!hasChanges.value) {
        alert('No se encontraron cambios para aplicar. No es necesario continuar.');
        return;
      }
      stepIndex.value = 3;
      break;
    case 3:
      return applyMigration();
  }
}

// End Functions

// Life cycle
onMounted(() => {
  const route = useRoute();
  try {
    if (route && route.query && route.query.autoDryRun) {
      void runDryRun();
    }
  } catch (e) {}
});

// End Life cycle

// Computed
const changedCount = computed(() => {
  if (!dryRunResult.value) return 0;
  return dryRunResult.value.filter((r) => r.changed).length;
});

const applyChangedCount = computed(() => {
  if (!applyResult.value) return 0;
  return applyResult.value.filter((r) => r.changed).length;
});

const sampleResults = computed(() => {
  if (!dryRunResult.value) return [];
  return dryRunResult.value.filter((r) => r.changed).slice(0, 10);
});

const hasChanges = computed(() => {
  return !!(dryRunResult.value && dryRunResult.value.some((r: MigrationResult) => r.changed));
});

const primaryLabel = computed(() => {
  switch (stepIndex.value) {
    case 0:
      return 'Exportar copia de seguridad';
    case 1:
      return 'Simular migración (dry-run)';
    case 2:
      return 'Siguiente (Revisar)';
    case 3:
      return 'Aplicar migración';
    default:
      return 'Acción';
  }
});

// End Computed

// Watch
</script>

<style scoped>
.migrate-dates {
}
.stepper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}
.step {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}
.step.active {
  background: rgba(0, 0, 0, 0.02);
  border-color: var(--ion-color-primary);
}
.step.done {
  background: rgba(220, 255, 220, 0.6);
}
.marker {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background: #f0f0f0;
}
.info .title {
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.status {
  color: #006;
  margin-top: 12px;
}
.error {
  color: #a00;
  margin-top: 12px;
}
pre {
  background: #f8f8f8;
  padding: 8px;
  border-radius: 6px;
  overflow: auto;
}
</style>
