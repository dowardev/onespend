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

# Frontend e2e tests
cd front && pnpm run test:e2e

# Backend tests
cd back && composer test

# Electron (desktop development)
cd front && pnpm run electron:dev

# Electron (production build)
cd front && pnpm run build && pnpm run electron:build
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
- `app/Models/` — Account, BudgetEntry, BudgetEntryGroup, BudgetProvider, BudgetProviderProduct, Income, Supplier, SupplierProduct, SyncMetadata, Template, Attachment
- `app/Http/Controllers/` — Auth (SSO), AttachmentController, SyncController
- `routes/api.php` — Sync API (changes, merge, full, resolve-conflict) + Attachments CRUD
- `routes/auth.php` — SSO auth routes
- **Colas:** database driver (dev) / sync (producción en hosting compartido)

### Frontend (`front/`)
- **Ionic 8** + **Vue 3** con Composition API
- **Multi-plataforma:**
  - Web (Vite 5)
  - Android (Capacitor 8, app ID: com.dowardev.abogaz)
  - Desktop (Electron 33 con cross-platform builds: Linux, Windows, Mac, RPM)
- **Pinia** para estado
- **Chart.js** + vue-chartjs para gráficos
- **Offline-first:** API Sync con resolución de conflictos
- `src/controllers/` — Controladores de negocio
- `src/composables/` — Composables Vue
- `src/stores/` — Pinia stores
- `src/services/` — Servicios API
- `src/migrations/` — Migraciones client-side (offline storage)
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

---

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
