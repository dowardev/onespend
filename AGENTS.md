<!--
SPDX-FileCopyrightText: 2026 DowarDev

SPDX-License-Identifier: AGPL-3.0-only
-->

# AGENTS.md - OneSpend

## Project Structure

Monorepo con dos directorios:
- `back/` — Laravel 12 backend (PHP 8.2+)
- `front/` — Ionic Vue 8 frontend multi-plataforma (Node.js, pnpm)

## Developer Commands

```bash
# Run backend (concurrent: serve + queue + pail + npm dev)
cd back && composer dev

# Run frontend (web)
cd front && pnpm run dev

# Build frontend (web)
cd front && pnpm run build           # vite build (sin lint/typecheck)

# Frontend typecheck
cd front && pnpm run typecheck       # vue-tsc --noEmit

# Frontend lint
cd front && pnpm run lint            # oxlint + eslint

# Frontend format
cd front && pnpm run format

# Frontend unit tests
cd front && pnpm run test:unit

# Frontend e2e tests (Playwright)
cd front && pnpm run test:e2e

# Backend tests
cd back && composer test

# Electron (desktop development)
cd front && pnpm run electron:dev

# Electron (production build)
cd front && pnpm run build && pnpm run electron:build

# Frontend i18n translation workflow (lingo.dev)
cd front && pnpm run i18n:translate    # run lingo.dev to sync locale files
cd front && pnpm run i18n:check       # verify locales are in sync (no edits)
```

## Backend Setup

```bash
cd back
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

**Database:** MariaDB (default: `onespend` database)

**Default port:** 8000

## Architecture

### Backend (`back/`)
- **Laravel 12** con PHP 8.2+
- **Autenticación:** SSO externo ([tu-org/sso-server](https://gitlab.com/dowardev/sso)) con JWT
  - Middleware: `sso.auth`, `sso.user`
  - *(Legacy Sanctum+Breeze removido — LBDS-119)*
- **Dominio:** Control de gastos/presupuestos (budget/expense tracking)
- `app/Models/` — Account, Attachment, BudgetEntry, BudgetEntryGroup, BudgetProvider, BudgetProviderProduct, MergeJob, RecurringRecord, RecurringRecordProduct, Supplier, SupplierProduct, SyncMetadata, User
- `app/Http/Controllers/` — AccountController, AttachmentController, BudgetEntryController, BudgetEntryGroupController, BudgetProviderController, BudgetProviderProductController, HealthController, MetricsController, RecurringRecordController, RecurringRecordProductController, SupplierController, SupplierProductController, SyncController
- `routes/api.php` — REST API (`accounts`, `budget-entries`, `budget-entry-groups`, `budget-providers`, `budget-provider-products`, `suppliers`, `supplier-products`, `recurring-records`, `recurring-record-products`) + Sync API (`/sync/changes`, `/sync/merge`, `/sync/full`, `/sync/resolve-conflict`, `/sync/resolve-conflicts-batch`, `/sync/conflicts`, `/sync/active-conflicts`, `/sync/merge-status/{jobId}`, `/sync/health`) + Attachments CRUD (`/budget-entries/{id}/attachments`, `/budget-providers/{id}/attachments`, `/attachments/{id}/download`, `DELETE /attachments/{id}`, `/attachments/batch-delete`) + Metrics (`/metrics`)
- `routes/auth.php` — SSO auth routes
- **Colas:** database driver (dev) / sync (producción en hosting compartido)
- **Schedule (cron):** data cleanup 3 AM, sync monitor cada 10 min (configurado en `routes/console.php`; requiere `* * * * * cd back && php artisan schedule:run`)

### Frontend (`front/`)
- **Ionic 8** + **Vue 3** con Composition API
- **Multi-plataforma:**
  - Web (Vite 5)
  - Android (Capacitor 8, app ID: com.dowardev.onespend)
  - Desktop (Electron 33 con cross-platform builds: Linux, Windows, Mac, RPM)
- **Pinia** para estado
- **Chart.js** + vue-chartjs para gráficos
- **i18n:** `vue-i18n` 9 con locales `es` (default) y `en`; selector en el menú lateral (`Menu → Idioma`) persiste la elección en `configDb`. Config en `front/src/i18n.ts`, mensajes en `front/src/locales/{es,en}.json`. La primera vez (sin override persistido) se llama `detectSystemLocale()` que resuelve `es-*` a `es` y cualquier otro a `en` (política del reviewer de F-Droid).
- **Sync opt-in (LBDS-289):** la pantalla **Ajustes → Conexiones** (ruta `/settings/connections`) tiene un toggle `Sincronización` y un campo `URL del servidor`. El build-time `VITE_API_URL` solo aparece como placeholder; el usuario puede pegar otra URL y la app sincroniza contra esa. Sync solo se activa con toggle ON + URL no vacía.
- **Override de SSO (LBDS-295):** además de la URL del servidor de sync, en la misma pantalla **Conexiones** se puede configurar `URL del servidor SSO` (`VITE_SSO_URL`) y `URL del panel de login` (`VITE_SSO_FRONTEND_URL`). El resolver vive en `front/src/services/sso/ssoConfig.ts` y persiste en `configDb` (`ssoServerUrl`, `ssoFrontendUrl`); el env var del build es el fallback.
- **Android build-only env var:** `SSO_CLIENT_ID_NATIVE` (en `front/.env.production`) es OBLIGATORIO distinto del web (`VITE_SSO_CLIENT_ID`) porque el SSO valida `redirect_url` por match exacto y la app usa custom scheme `com.dowardev.onespend://auth/callback`. `pnpm run build:native` lo lee; sin él el build warn-ea y cae al client web, lo que falla el sign-in en device.
- **Offline-first:** API Sync con resolución de conflictos, queue con ack y DLQ (LBDS-244), drain de adjuntos en `finally` del merge con backoff exponencial (LBDS-287), attachment deletes encolados (LBDS-280), detector de divergencias local↔server (LBDS-276).
- **Performance/Glossary/Income (LBDS-210, LBDS-228):** página de configuración de performance (`/statistics/performance/config`) con mapeo categoría→sección; glossary financiero (`useFinancialGlossary`) e income statement labels (`useIncomeStatement.labelMap`) consumen `vue-i18n` para seguir el idioma activo.
- `src/controllers/` — Controladores de negocio
- `src/composables/` — Composables Vue (lógica reactiva compartida: `useAttachments`, `useDatePicker`, `useSync`, `useEntryLoader`, etc.)
- `src/stores/` — Pinia stores
- `src/services/` — Servicios API (HTTP, sync, SSO, etc.)
- `src/db/` — Capa Dexie (IndexedDB): `configDb` (configuración persistida), `syncQueueDb`, `attachmentsDb`, migrations client-side
- `src/migrations/` — Migraciones client-side (offline storage)
- `src/locales/` — Mensajes `vue-i18n` (`es.json`, `en.json`)
- `src/views/` — Vistas organizadas por feature

## Testing

```bash
# Backend (PHPUnit)
cd back && composer test

# Frontend unit (Vitest)
cd front && pnpm run test:unit

# Frontend e2e (Cypress)
cd front && pnpm run test:e2e
```

## Code Conventions

### Frontend (TypeScript): Named Parameters Pattern

All functions must use a single `params` object instead of positional parameters. Destructure inside the function body.

```ts
// ✅ Correct
function holaMundo(params: { objeto1: string; objeto2: number }) {
  const { objeto1, objeto2 } = params
}

// ❌ Wrong
function holaMundo(objeto1: string, objeto2: number) { ... }
```

> This pattern requires TypeScript. In plain JS the inline type annotation is invalid syntax — use JSDoc `@param` instead if needed.

### Frontend (Vue Components): Controller or Composable Communication

Vue components may contain any **local** logic (props, emits, computed, watch, onMounted, reactive variables, internal functions, etc.) that is internal to the component. However, any logic that is **shared** with or reused by other parts of the application — such as API calls, store access, or cross-component business logic — must go through **controllers or composables**, depending on what best fits the case. These are the bridge between Vue components and external application layers.

```ts
// ✅ Correct — local logic in component is fine
const isOpen = ref(false)
const label = computed(() => isOpen.value ? 'Open' : 'Closed')
onMounted(() => { isOpen.value = true })

// ✅ Correct — shared logic uses a controller
import { useAuthController } from '@/controllers/authController'
const controller = useAuthController()
controller.login(params)

// ✅ Correct — shared logic uses a composable
import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()
login(params)

// ❌ Wrong — component accesses store directly
import { useAuthStore } from '@/stores/auth'
const store = useAuthStore()

// ❌ Wrong — component calls API service directly
import { authApi } from '@/services/auth'
authApi.login(params)
```

### Frontend (Vue Components): Template Structure

There are two distinct template patterns depending on the file type: **Pages** (route-level views) and **Components** (reusable UI blocks). Both must follow the numbered section structure in the script.

#### Pages (`src/views/`)

Pages are route-level views. Root element is `<ion-page>` with `<ion-header>` and `<ion-content>`.
Reference: `guides/TemplatePage.vue`

```vue
<template>
  <ion-page>
    <ion-header>...</ion-header>
    <ion-content>
      <ion-grid>
        <ion-row class="ion-justify-content-center">
          <ion-col size="4"><!-- content --></ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <!-- popovers -->
    <!-- alerts -->
    <!-- modals -->
  </ion-page>
</template>
```

#### Components (`src/views/**/components/` or `src/components/`)

Components are reusable blocks. NO `<ion-page>`, NO `<ion-header>`, NO `<ion-content>`.
Reference: `guides/TemplateComponent.vue`

```vue
<template>
  <!-- No ion-page — this is a reusable component -->
  <ion-list class="transparent">
    <ion-card class="shadow1">
      <ion-item lines="full" class="transparent">...</ion-item>
    </ion-card>
  </ion-list>
</template>
```

**Script (`<script lang="ts" setup>`) — same numbered section structure for both:**

```ts
<script setup lang="ts>
// 1. Imports (ionic/vue/ionicons)
//    - Vue: ref, computed, watch, onMounted, etc.
//    - Ionicons: addOutline, chevronBackOutline, etc.
//    - Utilidades: date-fns, mensajes, db, etc.
//    - Ionic: IonButton, IonContent, IonDatetime, etc.
//    - Paquetes locales: @/utils/..., @/store/..., etc.
import { ref, computed, onMounted } from 'vue'
import { addOutline } from 'ionicons/icons'
import { format } from 'date-fns'
import { IonButton, IonContent, IonDatetime } from '@ionic/vue'

// 2. Controllers / Composables
//    - Importar e instanciar controladores/composables
import { AuthController } from '@/controllers/authController'
const authController = new AuthController()

// 3. Components
//    - Importar componentes Vue hijos
import ChildComponent from '@/components/ChildComponent.vue'

// 4. Interface and types imports
//    - SOLO types/interfaces (import type)
import type { User, EventItem } from '@/stores/userStore'
import type { ViewCalendar } from '@/store/calendarStore'

// 5. Main (props, emits, etc.)
defineProps<{ items: Item[] }>()
defineEmits<{ update: [value: string] }>()

// 6. Vars and const
const isOpen = ref(false)
const loading = ref(false)

// 7. Watch
watch(() => props.items, (val) => { /* ... */ })

// 8. Computed
const filtered = computed(() => items.value.filter(...))

// 9. OnMounted
onMounted(() => { loadData() })

// 10. Functions (named parameters pattern)
function loadData(params: { force?: boolean }) { /* ... */ }
</script>
```

**Reglas:**
- Cada sección **debe** tener su comentario numerado (`// 1.`, `// 2.`, etc.)
- La sección 1 agrupa **todos** los imports de valores (no types)
- La sección 4 es **exclusivamente** `import type`
- ⚠️ **Los imports de Ionic van en la sección 1**, nunca en la sección 4

### Frontend (Vue Components): Controller vs Composable Decision

Determina cuándo usar un **controller** vs un **composable**:

| Escenario | Usar | Ejemplo |
|-----------|------|---------|
| Lógica de negocio pura (CRUD, cálculos, reglas) | Controller | `accountsController.getAccounts()` |
| Estado reactivo + lógica (ref, computed, watch) | Composable | `useAccountSelection({ items, getAccountId })` |
| Acceso a store Pinia + lógica | Controller o Composable | `budgetDayStore.saveBudgetData()` en controller |
| Lógica compartida entre múltiples componentes | Composable | `useAttachments`, `useDatePicker` |
| Operaciones que NO requieren estado Vue | Controller | `budgetEntriesController.getEntries()` |
| Operaciones que SÍ requieren estado reactivo | Composable | `useDeleteConfirm({ onConfirm })` |

**Regla general:** Si necesitas `ref`, `computed`, `watch`, o `onMounted` → **composable**.
Si solo necesitas funciones puras o acceso a datos → **controller**.

### Frontend (Vue Components): Ionic Imports

Todos los componentes Vue que usen componentes de Ionic en su template **deben importar explícitamente** dichos componentes en la **sección 1** (`// 1. Imports (ionic/vue/ionicons)`) del script.

```ts
// ✅ Correcto — importa lo que usa el template en sección 1
import { IonButton, IonContent, IonDatetime, IonPopover } from '@ionic/vue'

// ❌ Incorrecto — usa IonDatetime en template pero no lo importa
// (TypeScript no puede inferir tipos: $el es never, métodos reset/confirm/cancel no existen)

// ❌ Incorrecto — importar Ionic en sección 4 (types)
```

> Ionic Vue registra componentes globalmente via `app.use(IonicVue)`, pero TypeScript necesita la importación en la **sección 1** para inferir tipos correctamente (ej. `InstanceType<typeof IonDatetime>`, acceso a `$el`, métodos como `reset()`, `confirm()`, `cancel()`).

### Frontend (Ionic): Ionic-First Layout

Preferir las utilidades de layout de Ionic sobre CSS personalizado:

- `ion-grid` / `ion-row` / `ion-col` para diseño responsivo (nunca `flexbox` manual para layout de página)
- Clases utilitarias: `ion-padding-*`, `ion-margin-*`, `ion-text-*`, `ion-justify-content-*`, `ion-align-items-*`
- `ion-list` con `ion-item` para formularios en lugar de `<div>` con CSS
- `ion-card` para tarjetas
- Modales: `ion-modal` con `ion-header` + `ion-content`
- Popovers: `ion-popover` con `ion-content`
- NO usar `<div>` con estilos manuales cuando existe un componente Ionic equivalente

## Commit Policy

NEVER create git commits unless the user explicitly requests it. This overrides any skill or workflow that suggests committing as a final step.

## Ticket / Issue Policy

NEVER create or edit GitLab issues (or any external issue/ticket) without the user explicitly asking for it. Creating an issue is a mutation an agent must never do on its own initiative — even when a finding, follow-up, or proposal seems obvious. If you think an issue is warranted, propose it in the conversation and ask the user first; only create it after an explicit request. This also covers branch names derived from issues: do not branch off an issue that was not requested.

This rule exists because tickets (unlike code) are project-planning artifacts the user owns: content, priority, and even whether an item deserves a ticket are the user's decisions, not the agent's. The same applies to changelog/package edits that imply a release decision — propose, don't act.

Before creating anything, search for open duplicates first:
  GET /issues?state=opened&search=QUERY&per_page=20
If a clear duplicate exists, do NOT create a second one: comment on the existing
issue and ask the user (comment on the existing / create anyway).


## Formato HTML / Vue / Ionic (legibilidad para review)

- Dejá UNA línea en blanco entre cada par de elementos hermanos, en TODOS los niveles de anidación (no solo primer nivel).
- No agregues línea en blanco justo después de la apertura ni justo antes del cierre, solo ENTRE hermanos.

Ejemplo correcto:

```vue
<ion-item>
  <ion-label>Título</ion-label>

  <ion-button>Guardar</ion-button>
</ion-item>
```

Ejemplo incorrecto (sin saltos):

```vue
<ion-item>
  <ion-label>Título</ion-label>
  <ion-button>Guardar</ion-button>
</ion-item>
```

